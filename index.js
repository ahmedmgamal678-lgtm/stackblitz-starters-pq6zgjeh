// run `node index.js` in the terminal

console.log(`Hello Node.js v${process.versions.node}!`);
const express=require('express');const fs=require('fs');const path=require('path');const multer=require('multer');
const app=express();const PORT=process.env.PORT||3000;const ROOT=__dirname;const DATA=path.join(ROOT,'data','data.json');
app.use(express.json({limit:'5mb'}));app.use(express.urlencoded({extended:true}));
const uploadDir=path.join(ROOT,'public','uploads','products');fs.mkdirSync(uploadDir,{recursive:true});
const storage=multer.diskStorage({destination:(_,__,cb)=>cb(null,uploadDir),filename:(_,file,cb)=>cb(null,Date.now()+'-'+file.originalname.replace(/[^a-zA-Z0-9._-]/g,'_'))});const upload=multer({storage});
function read(){return JSON.parse(fs.readFileSync(DATA,'utf8'))}const clients=new Set();
function broadcast(){for(const res of clients){res.write(`data: ${JSON.stringify({type:'update',at:Date.now()})}\n\n`)}}
function save(d){fs.writeFileSync(DATA,JSON.stringify(d,null,2),'utf8');broadcast()}
app.get('/api/live',(req,res)=>{res.set({'Content-Type':'text/event-stream','Cache-Control':'no-cache','Connection':'keep-alive'});res.flushHeaders();res.write('data: connected\n\n');clients.add(res);req.on('close',()=>clients.delete(res))});
app.get('/api/products',(req,res)=>res.json(read().products));
app.post('/api/products',(req,res)=>{const d=read();const p={id:Date.now(),category:req.body.category||'accessories',icon:req.body.icon||'🏍️',name:req.body.name,code:req.body.code||`MX-${Date.now()}`,price:Number(req.body.price)||0,stock:Number(req.body.stock)||0,image:req.body.image||''};d.products.push(p);save(d);res.json(p)});
app.put('/api/products/:id',(req,res)=>{const d=read(),p=d.products.find(x=>x.id==req.params.id);if(!p)return res.status(404).json({error:'not found'});Object.assign(p,{...req.body,price:req.body.price===undefined?p.price:Number(req.body.price),stock:req.body.stock===undefined?p.stock:Number(req.body.stock)});save(d);res.json(p)});
app.delete('/api/products/:id',(req,res)=>{const d=read();d.products=d.products.filter(x=>x.id!=req.params.id);save(d);res.json({ok:true})});
app.post('/api/upload',upload.single('image'),(req,res)=>res.json({url:`/uploads/products/${req.file.filename}`}));
app.get('/api/offers',(req,res)=>res.json(read().offers));app.post('/api/offers',(req,res)=>{const d=read();const o={id:Date.now(),productId:Number(req.body.productId),discount:Number(req.body.discount)||0,active:req.body.active!==false};d.offers.push(o);save(d);res.json(o)});app.delete('/api/offers/:id',(req,res)=>{const d=read();d.offers=d.offers.filter(x=>x.id!=req.params.id);save(d);res.json({ok:true})});
app.get('/api/orders',(req,res)=>res.json(read().orders));app.post('/api/orders',(req,res)=>{const d=read();const items=req.body.items||[];const total=items.reduce((s,i)=>s+Number(i.price)*Number(i.quantity),0);const order={id:Date.now(),customer:req.body.customer||{},items,total,status:'جديد',createdAt:new Date().toISOString()};d.orders.push(order);const u=req.body.customer||{};if(u.phone||u.name){let user=d.users.find(x=>x.phone&&x.phone===u.phone);if(!user)d.users.push({id:Date.now()+1,name:u.name||'',phone:u.phone||'',orders:1});else user.orders=(user.orders||0)+1}save(d);res.json(order)});
app.put('/api/orders/:id',(req,res)=>{const d=read(),o=d.orders.find(x=>x.id==req.params.id);if(!o)return res.status(404).json({error:'not found'});Object.assign(o,req.body);save(d);res.json(o)});
app.get('/api/users',(req,res)=>res.json(read().users));app.get('/api/contact',(req,res)=>res.json(read().contact));app.get('/api/settings',(req,res)=>res.json(read().settings||{}));app.put('/api/settings',(req,res)=>{const d=read();d.settings={...(d.settings||{}),...req.body};save(d);res.json(d.settings)});app.put('/api/contact',(req,res)=>{const d=read();d.contact={...d.contact,...req.body};save(d);res.json(d.contact)});
app.get('/api/dashboard',(req,res)=>{const d=read();res.json({products:d.products.length,orders:d.orders.length,users:d.users.length,sales:d.orders.filter(o=>o.status!=='ملغي').reduce((s,o)=>s+Number(o.total||0),0),stock:d.products.reduce((s,p)=>s+Number(p.stock||0),0)})});
app.use(express.static(path.join(ROOT,'public')));app.get('/admin',(req,res)=>res.sendFile(path.join(ROOT,'public','admin','index.html')));app.listen(PORT,()=>console.log(`MOTOX running: http://localhost:${PORT}`));
