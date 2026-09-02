import 'dotenv/config';
import { Worker } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import OpenAI from 'openai';
const prisma = new PrismaClient();
const ai = process.env.OPENAI_API_KEY ? new OpenAI({apiKey:process.env.OPENAI_API_KEY}) : null;
const worker = new Worker('moderation', async job => {
  if (job.name !== 'post') return;
  const post = await prisma.post.findUnique({where:{id:job.data.postId}});
  if (!post) return;
  if (!ai) { await prisma.post.update({where:{id:post.id},data:{moderation:'REVIEW'}}); return; }
  const r = await ai.moderations.create({model:'omni-moderation-latest',input:post.body});
  const flagged = Boolean(r.results?.[0]?.flagged);
  await prisma.post.update({where:{id:post.id},data:{moderation:flagged?'BLOCKED':'APPROVED'}});
});
worker.on('failed',(job,err)=>console.error('moderation worker failed',job?.id,err));
