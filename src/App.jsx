import { useState, useEffect } from "react"
export default function App(){
const [p,setP]=useState(()=>{try{return JSON.parse(localStorage.getItem("t")||"[]")}catch{return[]}})
const [n,setN]=useState("");const [pr,setPr]=useState("");const [a,setA]=useState(!1)
useEffect(()=>{localStorage.setItem("t",JSON.stringify(p))},[p])
return <div style={{background:"#f0f2f5",minHeight:"100vh",direction:"rtl",fontFamily:"sans-serif"}}>
<header style={{background:"#1877F2",color:"#fff",padding:"14px",display:"flex",justifyContent:"space-between"}}>
<b>تواصل</b><button onClick={()=>setA(!a)} style={{background:"#fff",color:"#1877F2",border:0,padding:"6px 12px",borderRadius:"20px"}}>{a?"اغلاق":"+ اضافة"}</button>
</header>
{a&&<div style={{background:"#fff",margin:"12px",padding:"14px",borderRadius:"12px"}}>
<input value={n} onChange={e=>setN(e.target.value)} placeholder="اسم المنتج" style={{width:"100%",padding:"10px",margin:"6px 0",borderRadius:"8px",border:"1px solid #ddd"}}/>
<input value={pr} onChange={e=>setPr(e.target.value)} placeholder="السعر" style={{width:"100%",padding:"10px",margin:"6px 0",borderRadius:"8px",border:"1px solid #ddd"}}/>
<button onClick={()=>{if(!n||!pr)return;setP([...p,{id:Date.now(),name:n,price:pr}]);setN("");setPr("");setA(!1)}} style={{width:"100%",background:"#1877F2",color:"#fff",border:0,padding:"10px",borderRadius:"8px"}}>حفظ</button>
</div>}
<div style={{padding:"12px"}}>
{p.map(x=><div key={x.id} style={{background:"#fff",padding:"12px",borderRadius:"12px",marginBottom:"8px",display:"flex",justifyContent:"space-between"}}>
<div><b>{x.name}</b><br/><span style={{color:"#1877F2"}}>{x.price}</span></div>
<div><button onClick={()=>setP(p.filter(y=>y.id!==x.id))} style={{background:"#eee",border:0,padding:"6px",borderRadius:"6px"}}>حذف</button></div>
</div>)}
{p.length===0&&<div style={{textAlign:"center",color:"#888",padding:"20px",background:"#fff",borderRadius:"12px"}}>فارغ - اضغط + اضافة</div>}
</div></div>
}
