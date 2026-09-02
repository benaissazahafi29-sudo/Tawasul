import 'dotenv/config';
import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import multer from 'multer';
import { Server } from 'socket.io';
import { PrismaClient } from '@prisma/client';
import { authenticator } from 'otplib';
import OpenAI from 'openai';
import { AccessToken } from '@livekit/server-sdk';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Queue } from 'bullmq';

const prisma = new PrismaClient();
const app = express();
const server = http.createServer(app);
const io = new Server(server,{cors:{origin:process.env.FRONTEND_URL?.split(',')||'*',credentials:true}});
const upload=multer({limits:{fileSize:Number(process.env.MAX_UPLOAD_BYTES||100*1024*1024)}});
const limiter=rateLimit({windowMs:60*1000,max:120,standardHeaders:true,legacyHeaders:false});
app.use(helmet()); app.use(cors({origin:process.env.FRONTEND_URL?.split(',')||true,credentials:true})); app.use(express.json({limit:'2mb'})); app.use(limiter);
const ai = process.env.OPENAI_API_KEY ? new OpenAI({apiKey:process.env.OPENAI_API_KEY}) : null;
const moderationQueue = new Queue('moderation',{connection:{url:process.env.REDIS_URL||'redis://localhost:6379'}});
const s3 = process.env.S3_ENDPOINT ? new S3Client({region:process.env.S3_REGION||'us-east-1',endpoint:process.env.S3_ENDPOINT,forcePathStyle:true,credentials:{accessKeyId:process.env.S3_ACCESS_KEY||'',secretAccessKey:process.env.S3_SECRET_KEY||''}}):null;
const sign=(p,exp='15m')=>jwt.sign(p,process.env.JWT_SECRET, {expiresIn:exp});
const auth=async(req,res,next)=>{try{const token=(req.headers.authorization||'').replace('Bearer ','');const p=jwt.verify(token,process.env.JWT_SECRET);req.user=await prisma.user.findUnique({where:{id:p.sub}});if(!req.user||req.user.isBanned) return res.status(401).json({error:'unauthorized'});next()}catch{return res.status(401).json({error:'unauthorized'})}};
const audit=(action,userId,req,metadata={})=>prisma.auditLog.create({data:{action,userId,ip:req.ip,metadata}}).catch(()=>{});
const adminOnly=(req,res,next)=>{if(!['ADMIN','SUPERADMIN'].includes(req.user?.role)) return res.status(403).json({error:'admin_required'}); next()};

app.get('/api/health',(_,res)=>res.json({ok:true,service:'tawasol-api',time:new Date().toISOString()}));
app.post('/api/auth/register',async(req,res)=>{try{const emailNorm=typeof req.body.email==='string'?req.body.email.trim().toLowerCase():undefined; const phoneNorm=typeof req.body.phone==='string'?req.body.phone.trim():undefined; const usernameNorm=typeof req.body.username==='string'?req.body.username.trim().toLowerCase():''; const name=typeof req.body.name==='string'?req.body.name.trim():''; const password=typeof req.body.password==='string'?req.body.password:''; if(password.length<8||name.length<2||usernameNorm.length<3||(!emailNorm&&!phoneNorm))return res.status(400).json({error:'missing_fields'});const exists=await prisma.user.findFirst({where:{OR:[emailNorm?{email:emailNorm}:undefined,phoneNorm?{phone:phoneNorm}:undefined,{username:usernameNorm}].filter(Boolean)}});if(exists)return res.status(409).json({error:'already_exists'});const u=await prisma.user.create({data:{email:emailNorm,phone:phoneNorm,name,username:usernameNorm,passwordHash:await bcrypt.hash(password,12)}});const token=sign({sub:u.id});await audit('register',u.id,req);res.json({user:{id:u.id,name:u.name,username:u.username},accessToken:token});}catch(e){res.status(500).json({error:'server_error'})}});
app.post('/api/auth/login',async(req,res)=>{const identifier=typeof req.body.identifier==='string'?req.body.identifier.trim():'';const password=typeof req.body.password==='string'?req.body.password:'';const normalized=identifier.toLowerCase();const u=await prisma.user.findFirst({where:{OR:[{email:normalized},{phone:identifier},{username:normalized}]}});if(!u||!(await bcrypt.compare(password,u.passwordHash)))return res.status(401).json({error:'invalid_credentials'});if(u.twoFactorEnabled)return res.json({requires2FA:true,userId:u.id});const token=sign({sub:u.id});await audit('login',u.id,req);res.json({requires2FA:false,accessToken:token});});
app.post('/api/auth/2fa/setup',auth,async(req,res)=>{const secret=authenticator.generateSecret();await prisma.user.update({where:{id:req.user.id},data:{twoFactorSecret:secret}});res.json({secret,otpauth:authenticator.keyuri(req.user.email||req.user.username,'Tawasol',secret)});});
app.post('/api/auth/2fa/verify',async(req,res)=>{const {userId,code}=req.body;const u=await prisma.user.findUnique({where:{id:userId}});if(!u?.twoFactorSecret||!authenticator.verify({token:code,secret:u.twoFactorSecret}))return res.status(401).json({error:'invalid_2fa'});await prisma.user.update({where:{id:u.id},data:{twoFactorEnabled:true}});res.json({accessToken:sign({sub:u.id})});});
app.get('/api/me',auth,(req,res)=>res.json({user:{id:req.user.id,name:req.user.name,username:req.user.username,email:req.user.email,phone:req.user.phone,twoFactorEnabled:req.user.twoFactorEnabled}}));

app.get('/api/feed',auth,async(req,res)=>res.json(await prisma.post.findMany({where:{moderation:'APPROVED'},include:{author:{select:{id:true,name:true,username:true,avatarUrl:true}}},orderBy:{createdAt:'desc'},take:50})));
app.post('/api/posts',auth,async(req,res)=>{const p=await prisma.post.create({data:{authorId:req.user.id,body:String(req.body.body||''),visibility:req.body.visibility||'PUBLIC',mediaUrl:req.body.mediaUrl||null}});await moderationQueue.add('post',{postId:p.id,body:p.body});res.status(201).json(p)});
app.delete('/api/posts/:id',auth,async(req,res)=>{const p=await prisma.post.findUnique({where:{id:req.params.id}});if(!p||p.authorId!==req.user.id)return res.status(403).json({error:'forbidden'});await prisma.post.delete({where:{id:p.id}});res.json({ok:true});});

app.post('/api/upload',auth,upload.single('file'),async(req,res)=>{if(!req.file)return res.status(400).json({error:'file_required'});if(s3){const key=`users/${req.user.id}/${crypto.randomUUID()}-${req.file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_')}`;await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET,Key:key,Body:req.file.buffer,ContentType:req.file.mimetype}));return res.json({key,url:`${process.env.PUBLIC_MEDIA_BASE_URL}/${key}`})}res.status(503).json({error:'object_storage_not_configured'});});

app.post('/api/messages',auth,async(req,res)=>{const {conversationId,receiverId,body,mediaUrl,disappearsAt}=req.body;let c=conversationId?await prisma.conversation.findUnique({where:{id:conversationId}}):null;if(!c){if(!receiverId)return res.status(400).json({error:'receiver_required'});c=await prisma.conversation.create({data:{participants:{connect:[{id:req.user.id},{id:receiverId}]}}})}const m=await prisma.message.create({data:{conversationId:c.id,senderId:req.user.id,receiverId,body,mediaUrl,disappearsAt:disappearsAt?new Date(disappearsAt):null}});io.to(c.id).emit('message:new',m);res.status(201).json(m)});
app.get('/api/messages/:conversationId',auth,async(req,res)=>res.json(await prisma.message.findMany({where:{conversationId:req.params.conversationId},orderBy:{createdAt:'asc'},take:200})));
io.on('connection',socket=>{socket.on('join',room=>socket.join(room));socket.on('typing',({room,user})=>socket.to(room).emit('typing',user));});

app.post('/api/live/token',auth,async(req,res)=>{if(!process.env.LIVEKIT_API_KEY||!process.env.LIVEKIT_API_SECRET)return res.status(503).json({error:'livekit_not_configured'});const room=req.body.room||`tawasol-${crypto.randomUUID()}`;const at=new AccessToken(process.env.LIVEKIT_API_KEY,process.env.LIVEKIT_API_SECRET,{identity:req.user.id,name:req.user.name});at.addGrant({room,roomJoin:true,canPublish:true,canSubscribe:true});res.json({room,token:await at.toJwt(),url:process.env.LIVEKIT_URL});});

app.post('/api/stores',auth,async(req,res)=>{const {name,slug}=req.body;const s=await prisma.store.create({data:{ownerId:req.user.id,name,slug}});res.status(201).json(s)});
app.post('/api/products',auth,async(req,res)=>{const {storeId,name,description,priceCents,currency='DZD',stock=0,mediaUrl}=req.body;const s=await prisma.store.findUnique({where:{id:storeId}});if(!s||s.ownerId!==req.user.id)return res.status(403).json({error:'forbidden'});res.status(201).json(await prisma.product.create({data:{storeId,name,description,priceCents,currency,stock,mediaUrl}}))});
app.post('/api/orders',auth,async(req,res)=>{const {storeId,items}=req.body;const ids=items.map(x=>x.productId);const ps=await prisma.product.findMany({where:{id:{in:ids},storeId}});let total=0;for(const x of items){const p=ps.find(v=>v.id===x.productId);if(!p||p.stock<x.quantity)return res.status(400).json({error:'stock_unavailable'});total+=p.priceCents*x.quantity}const order=await prisma.$transaction(async(tx)=>{const o=await tx.order.create({data:{buyerId:req.user.id,storeId,totalCents:total,items:{create:items.map(x=>({productId:x.productId,quantity:x.quantity,unitPriceCents:ps.find(p=>p.id===x.productId).priceCents}))}}});for(const x of items)await tx.product.update({where:{id:x.productId},data:{stock:{decrement:x.quantity}}});return o});res.status(201).json(order)});

app.post('/api/ai/chat',auth,async(req,res)=>{if(!ai)return res.status(503).json({error:'openai_not_configured'});const r=await ai.responses.create({model:process.env.OPENAI_MODEL||'gpt-5-mini',input:String(req.body.prompt||'')});res.json({text:r.output_text});});
app.post('/api/moderation/check',auth,async(req,res)=>{if(!ai)return res.status(503).json({error:'openai_not_configured'});const r=await ai.moderations.create({model:'omni-moderation-latest',input:String(req.body.text||'')});res.json(r);});

app.post('/api/payments/create',auth,async(req,res)=>{const provider=process.env.PAYMENT_PROVIDER;if(!provider)return res.status(503).json({error:'payment_provider_not_configured'});res.status(501).json({error:'provider_adapter_required',provider});});
app.post('/api/withdrawals',auth,async(req,res)=>{const amount=Number(req.body.amountCents);if(!Number.isInteger(amount)||amount<=0)return res.status(400).json({error:'invalid_amount'});res.status(501).json({error:'payout_provider_required'});});

app.get('/api/admin/health',auth,adminOnly,async(req,res)=>{res.json({ok:true,db:true,redis:!!process.env.REDIS_URL,storage:!!s3,ai:!!ai,livekit:!!process.env.LIVEKIT_API_KEY,queue:!!process.env.REDIS_URL})});
app.post('/api/admin/panic',auth,adminOnly,async(req,res)=>{await audit('panic',req.user.id,req,{reason:req.body.reason||'manual'});res.json({ok:true,mode:'panic_logged'});});

app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'internal_error'});});
const port=Number(process.env.PORT||4000); server.listen(port,()=>console.log(`Tawasol API listening on :${port}`));
