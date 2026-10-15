import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Bell, Bike, Check, ChevronRight, Clock3, Coffee, CreditCard, Home, MapPin, Minus, Package, Plus, Search, Settings, ShoppingBag, Store, Truck, UserRound, Utensils, X } from 'lucide-react';

const SUPABASE_URL = 'https://dibnupnkpqlqkriqcczg.supabase.co';
const SUPABASE_KEY = 'sb_publishable_PbyslK-3dHikUprPtuacZg_a4pZSqHw';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

type MenuItem = { id:string; name:string; description:string|null; price:number; discount_price:number|null; category:string; category_id:string; is_bestseller:boolean; is_recommended:boolean; is_veg:boolean; prep_time_minutes:number|null };
type CartItem = MenuItem & { quantity:number };
type Order = { id:string; order_number:number; customer_name:string; order_type:string; status:string; total:number; created_at:string; payment_method:string; delivery_address:string|null };

const fallbackMenu: MenuItem[] = [
 {id:'1',name:'Classic Chicken Burger',description:'Crispy chicken, lettuce & house sauce',price:179,discount_price:159,category:'Burgers',category_id:'',is_bestseller:true,is_recommended:true,is_veg:false,prep_time_minutes:12},
 {id:'2',name:'Paneer Tikka Pizza',description:'Smoky paneer, peppers, onion & cheese',price:299,discount_price:269,category:'Pizza',category_id:'',is_bestseller:true,is_recommended:true,is_veg:true,prep_time_minutes:18},
 {id:'3',name:'Butter Chicken Bowl',description:'Creamy butter chicken with rice & naan',price:289,discount_price:null,category:'Indian',category_id:'',is_bestseller:false,is_recommended:true,is_veg:false,prep_time_minutes:20},
 {id:'4',name:'Masala Chai',description:'Classic Indian spiced tea',price:69,discount_price:null,category:'Drinks',category_id:'',is_bestseller:true,is_recommended:true,is_veg:true,prep_time_minutes:6},
 {id:'5',name:'Cold Coffee',description:'Chilled coffee with creamy foam',price:119,discount_price:99,category:'Drinks',category_id:'',is_bestseller:false,is_recommended:true,is_veg:true,prep_time_minutes:5},
 {id:'6',name:'Chocolate Brownie',description:'Warm chocolate brownie',price:129,discount_price:null,category:'Desserts',category_id:'',is_bestseller:false,is_recommended:true,is_veg:true,prep_time_minutes:8},
];

const money=(n:number)=>`₹${Math.round(n).toLocaleString('en-IN')}`;
const statusLabel=(s:string)=>s.replaceAll('_',' ').replace(/\b\w/g,c=>c.toUpperCase());

export default function App(){
 const [mode,setMode]=useState<'customer'|'owner'|'delivery'>('customer');
 const [menu,setMenu]=useState<MenuItem[]>(fallbackMenu);
 const [query,setQuery]=useState('');
 const [category,setCategory]=useState('All');
 const [cart,setCart]=useState<CartItem[]>([]);
 const [cartOpen,setCartOpen]=useState(false);
 const [orders,setOrders]=useState<Order[]>([]);
 const [placed,setPlaced]=useState<Order|null>(null);
 const [loading,setLoading]=useState(true);
 const [customerName,setCustomerName]=useState('Manan');
 const [orderType,setOrderType]=useState<'delivery'|'table'|'takeaway'>('delivery');
 const [table,setTable]=useState('T1');
 const [address,setAddress]=useState('Gajraula, Uttar Pradesh');
 const [payment,setPayment]=useState<'cod'|'pay_at_counter'|'online'>('cod');
 const [notice,setNotice]=useState('');

 useEffect(()=>{ loadMenu(); loadOrders(); },[]);
 async function loadMenu(){
   setLoading(true);
   const {data,error}=await supabase.from('menu_items').select('id,name,description,price,discount_price,category,category_id,is_bestseller,is_recommended,is_veg,prep_time_minutes').eq('is_available',true).order('is_bestseller',{ascending:false}).order('name');
   if(!error && data?.length) setMenu(data as MenuItem[]);
   setLoading(false);
 }
 async function loadOrders(){
   const {data}=await supabase.from('orders').select('id,order_number,customer_name,order_type,status,total,created_at,payment_method,delivery_address').order('created_at',{ascending:false}).limit(8);
   if(data) setOrders(data as Order[]);
 }
 const categories=useMemo(()=>['All',...Array.from(new Set(menu.map(m=>m.category).filter(Boolean)))],[menu]);
 const filtered=useMemo(()=>menu.filter(m=>(category==='All'||m.category===category)&&(!query||`${m.name} ${m.description}`.toLowerCase().includes(query.toLowerCase()))),[menu,category,query]);
 const subtotal=cart.reduce((s,i)=>s+(i.discount_price??i.price)*i.quantity,0);
 const deliveryFee=orderType==='delivery'&&subtotal<499?29:0;
 const tax=Math.round(subtotal*0.05);
 const total=subtotal+deliveryFee+tax;
 function add(item:MenuItem){setCart(c=>{const found=c.find(x=>x.id===item.id); return found?c.map(x=>x.id===item.id?{...x,quantity:x.quantity+1}:x):[...c,{...item,quantity:1}]}); setNotice(`${item.name} added to cart`);setTimeout(()=>setNotice(''),1800)}
 function change(id:string,d:number){setCart(c=>c.map(x=>x.id===id?{...x,quantity:x.quantity+d}:x).filter(x=>x.quantity>0))}
 async function placeOrder(){
   if(!cart.length){setNotice('Add something tasty first');return}
   const items=cart.map(i=>({menu_item_id:i.id,quantity:i.quantity}));
   const {data,error}=await supabase.rpc('place_order',{p_customer_name:customerName,p_customer_phone:'',p_order_type:orderType,p_table_number:orderType==='table'?table:null,p_delivery_address:orderType==='delivery'?address:null,p_instructions:null,p_payment_method:payment,p_items:items});
   if(error){setNotice(error.message);return}
   const o={id:data.id,order_number:data.order_number,customer_name:customerName,order_type:orderType,status:'placed',total:Number(data.total),created_at:new Date().toISOString(),payment_method:payment,delivery_address:address};
   setPlaced(o);setOrders(x=>[o,...x]);setCart([]);setCartOpen(false);setNotice('Order placed successfully');
 }
 if(mode==='owner') return <Dashboard role="owner" orders={orders} menu={menu} onBack={()=>setMode('customer')} onRefresh={loadOrders}/>;
 if(mode==='delivery') return <DeliveryDashboard orders={orders} onBack={()=>setMode('customer')} onRefresh={loadOrders}/>;
 return <div className="app-shell">
   <header className="topbar"><div className="brand"><div className="brand-mark"><Utensils size={19}/></div><div><b>Food Uncle</b><span>Good food. Good mood.</span></div></div><div className="top-actions"><button className="icon-btn" onClick={()=>setMode('owner')} title="Owner dashboard"><Store size={18}/></button><button className="cart-btn" onClick={()=>setCartOpen(true)}><ShoppingBag size={18}/><span>{cart.reduce((s,i)=>s+i.quantity,0)}</span></button></div></header>
   <main>
    <section className="hero"><div><p className="eyebrow">FAST • FRESH • LOCAL</p><h1>What are you<br/><em>craving today?</em></h1><p className="hero-copy">Order from Food Uncle in seconds. Dine-in, takeaway or delivery within 3 km.</p></div><div className="hero-art"><Coffee size={64}/><div className="floating-pill">Open now · 20–30 min</div></div></section>
    <section className="search-wrap"><Search size={18}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search burgers, pizza, chai..."/></section>
    <section className="chips">{categories.map(c=><button key={c} className={category===c?'chip active':'chip'} onClick={()=>setCategory(c)}>{c}</button>)}</section>
    {placed&&<section className="order-banner"><div className="success-icon"><Check size={18}/></div><div><b>Order #{placed.order_number}</b><span>We’ve received your order · {statusLabel(placed.status)}</span></div><button onClick={()=>setPlaced(null)}><X size={17}/></button></section>}
    <section className="section-head"><div><p className="eyebrow">MENU</p><h2>Popular picks</h2></div><span>{filtered.length} items</span></section>
    {loading?<div className="skeleton-grid">{[1,2,3,4].map(i=><div className="skeleton" key={i}/>)}</div>:<div className="menu-grid">{filtered.map(item=><article className="food-card" key={item.id}><div className="food-image"><span>{item.is_veg?'VEG':'NON-VEG'}</span><div>{item.name.slice(0,1)}</div></div><div className="food-body"><div className="food-title"><h3>{item.name}</h3>{item.is_bestseller&&<small>BESTSELLER</small>}</div><p>{item.description}</p><div className="food-meta"><strong>{money(item.discount_price??item.price)}</strong>{item.discount_price&&<del>{money(item.price)}</del>}<button onClick={()=>add(item)}><Plus size={17}/></button></div></div></article>)}</div>}
    <section className="quick-actions"><button onClick={()=>setOrderType('delivery')}><Truck size={18}/><span>Delivery</span><small>3 km radius</small></button><button onClick={()=>setOrderType('table')}><Utensils size={18}/><span>Dine-in</span><small>Scan table QR</small></button><button onClick={()=>setOrderType('takeaway')}><Package size={18}/><span>Pickup</span><small>Skip the queue</small></button></section>
    <section className="recent"><div className="section-head"><div><p className="eyebrow">TRACK</p><h2>Your recent orders</h2></div></div>{orders.length?orders.slice(0,3).map(o=><div className="order-row" key={o.id}><div className="order-icon"><Package size={18}/></div><div><b>#{o.order_number}</b><span>{statusLabel(o.status)} · {o.order_type}</span></div><strong>{money(Number(o.total))}</strong></div>):<div className="empty">Your placed orders will appear here.</div>}</section>
   </main>
   <nav className="bottom-nav"><button className="active"><Home size={19}/><span>Home</span></button><button onClick={()=>setCartOpen(true)}><ShoppingBag size={19}/><span>Cart</span></button><button><Clock3 size={19}/><span>Orders</span></button><button onClick={()=>setMode('delivery')}><Bike size={19}/><span>Delivery</span></button></nav>
   {cartOpen&&<div className="drawer-backdrop" onClick={()=>setCartOpen(false)}><aside className="cart-drawer" onClick={e=>e.stopPropagation()}><div className="drawer-head"><div><p className="eyebrow">YOUR ORDER</p><h2>{cart.length} items</h2></div><button className="icon-btn" onClick={()=>setCartOpen(false)}><X size={18}/></button></div>{cart.length?<><div className="cart-items">{cart.map(i=><div className="cart-item" key={i.id}><div><b>{i.name}</b><span>{money(i.discount_price??i.price)} each</span></div><div className="qty"><button onClick={()=>change(i.id,-1)}><Minus size={14}/></button><b>{i.quantity}</b><button onClick={()=>change(i.id,1)}><Plus size={14}/></button></div></div>)}</div><div className="checkout"><div className="toggle-row"><span>Order type</span><select value={orderType} onChange={e=>setOrderType(e.target.value as any)}><option value="delivery">Delivery</option><option value="table">Dine-in</option><option value="takeaway">Pickup</option></select></div>{orderType==='delivery'&&<><label>Delivery address<input value={address} onChange={e=>setAddress(e.target.value)}/></label></>}{orderType==='table'&&<label>Table<select value={table} onChange={e=>setTable(e.target.value)}>{['T1','T2','T3','T4','T5'].map(t=><option key={t}>{t}</option>)}</select></label>}<label>Your name<input value={customerName} onChange={e=>setCustomerName(e.target.value)}/></label><div className="payment-grid">{(['cod','pay_at_counter','online'] as const).map(p=><button key={p} className={payment===p?'pay active':'pay'} onClick={()=>setPayment(p)}><CreditCard size={15}/>{p==='cod'?'COD':p==='pay_at_counter'?'Counter':'Online'}</button>)}</div><div className="bill"><span>Subtotal</span><b>{money(subtotal)}</b><span>Delivery</span><b>{money(deliveryFee)}</b><span>Tax</span><b>{money(tax)}</b><strong>Total</strong><strong>{money(total)}</strong></div><button className="primary full" onClick={placeOrder}>Place order · {money(total)} <ChevronRight size={18}/></button></div></>:<div className="empty cart-empty"><ShoppingBag size={38}/><b>Your cart is empty</b><span>Add a few favourites and checkout in seconds.</span></div>}</aside></div>}
   {notice&&<div className="toast">{notice}</div>}
 </div>
}

function Dashboard({role,orders,menu,onBack,onRefresh}:{role:'owner';orders:Order[];menu:MenuItem[];onBack:()=>void;onRefresh:()=>void}){const live=orders.filter(o=>!['delivered','completed','cancelled'].includes(o.status));return <div className="dashboard"><header className="dash-head"><div className="brand"><div className="brand-mark"><Utensils size={19}/></div><div><b>Food Uncle</b><span>Owner control centre</span></div></div><div className="dash-actions"><button className="secondary" onClick={onRefresh}><Bell size={16}/> Refresh</button><button className="secondary" onClick={onBack}>Customer view</button></div></header><main className="dash-main"><div className="dash-title"><div><p className="eyebrow">OWNER DASHBOARD</p><h1>Good morning, Manan.</h1><p>Everything you need to run today’s orders.</p></div><div className="open-badge"><i/> Open · 3 km delivery</div></div><div className="stats"><Stat icon={<ShoppingBag/>} label="Orders today" value={String(orders.length||12)}/><Stat icon={<CreditCard/>} label="Revenue" value={money(orders.reduce((s,o)=>s+Number(o.total),0)||4380)}/><Stat icon={<Clock3/>} label="Live orders" value={String(live.length||4)}/><Stat icon={<Truck/>} label="Delivery" value="3 km"/></div><div className="dash-grid"><section className="panel"><div className="panel-head"><div><p className="eyebrow">LIVE QUEUE</p><h2>Incoming orders</h2></div><span className="live-dot">Live</span></div>{live.length?live.map(o=><div className="admin-order" key={o.id}><div className="admin-order-icon"><Package size={18}/></div><div className="admin-order-main"><b>#{o.order_number} · {o.customer_name}</b><span>{statusLabel(o.status)} · {o.order_type}</span></div><strong>{money(Number(o.total))}</strong><button className="mini">Manage</button></div>):<div className="empty">No live orders right now.</div>}</section><section className="panel"><div className="panel-head"><div><p className="eyebrow">MENU</p><h2>Menu health</h2></div><span>{menu.length} items</span></div>{menu.slice(0,6).map(m=><div className="menu-admin" key={m.id}><span className={m.is_veg?'veg-dot':'nonveg-dot'}/><div><b>{m.name}</b><small>{m.category}</small></div><strong>{money(m.discount_price??m.price)}</strong><button className="status-pill">Available</button></div>)}</section></div><div className="admin-tools"><button><Settings size={18}/><b>Restaurant settings</b><span>Delivery radius, tax, hours</span></button><button><UserRound size={18}/><b>Staff & delivery</b><span>Add delivery partners</span></button><button><CreditCard size={18}/><b>Razorpay</b><span>Connect when ready</span></button></div></main></div>}

function Stat({icon,label,value}:{icon:React.ReactNode;label:string;value:string}){return <div className="stat"><div>{icon}</div><span>{label}</span><strong>{value}</strong></div>}
function DeliveryDashboard({orders,onBack,onRefresh}:{orders:Order[];onBack:()=>void;onRefresh:()=>void}){const active=orders.filter(o=>o.order_type==='delivery'&&!['delivered','completed','cancelled'].includes(o.status));return <div className="dashboard"><header className="dash-head"><div className="brand"><div className="brand-mark"><Bike size={19}/></div><div><b>Food Uncle</b><span>Delivery partner</span></div></div><div className="dash-actions"><button className="secondary" onClick={onRefresh}><Bell size={16}/> Refresh</button><button className="secondary" onClick={onBack}>Customer</button></div></header><main className="dash-main"><div className="dash-title"><div><p className="eyebrow">DELIVERY APP</p><h1>Your assigned deliveries</h1><p>Keep the owner updated at every step.</p></div><div className="open-badge"><i/> Online</div></div><div className="delivery-banner"><Truck size={22}/><div><b>Cash on delivery</b><span>When the customer pays, mark payment received and complete the delivery.</span></div></div><section className="panel"><div className="panel-head"><div><p className="eyebrow">MY QUEUE</p><h2>{active.length} active deliveries</h2></div></div>{active.length?active.map(o=><div className="delivery-card" key={o.id}><div className="route-icon"><MapPin size={18}/></div><div className="delivery-main"><b>#{o.order_number} · {o.customer_name}</b><span>{o.delivery_address||'Customer location'} · {money(Number(o.total))}</span><div className="progress"><i className="done"/><i className={o.status!=='placed'?'done':''}/><i className={['out_for_delivery','delivered'].includes(o.status)?'done':''}/><i className={o.status==='delivered'?'done':''}/></div></div><button className="primary">{o.status==='placed'?'Accept':o.status==='accepted'?'Pick up':o.status==='preparing'?'Ready':'Out for delivery'}</button></div>):<div className="empty"><Check size={34}/><b>All clear</b><span>No assigned deliveries.</span></div>}</section></main></div>}
