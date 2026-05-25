const SB_URL='https://yaupttkahhphwcaitylp.supabase.co';
const SB_KEY='eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InlhdXB0dGthaGhwaHdjYWl0eWxwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk2Njk4OTEsImV4cCI6MjA5NTI0NTg5MX0.UwqZLuPCZGYoqBUaPI7myJAxNKj3zaFGMkNgg64jkIo';
const sb=window.supabase.createClient(SB_URL,SB_KEY);

let currentUser=null;

// TOAST
function toast(title,msg,err=false){
  const t=document.getElementById('toast');
  document.getElementById('tTitle').textContent=title;
  document.getElementById('tMsg').textContent=msg;
  t.className='toast'+(err?' err':'');
  setTimeout(()=>t.classList.add('open'),10);
  setTimeout(()=>t.classList.remove('open'),4000);
}

// MODAL
function openModal(id){document.getElementById(id).classList.add('open');}
function closeModal(id){document.getElementById(id).classList.remove('open');}

// NAV
function nav(section){
  document.querySelectorAll('.section').forEach(s=>s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
  document.getElementById('sec-'+section).classList.add('active');
  document.getElementById('nav-'+section).classList.add('active');
  const titles={overview:['Overview','Your business at a glance'],orders:['Orders','Track every order in real time'],inventory:['Inventory','Monitor your stock levels'],distributors:['Distributors','Manage your network'],khata:['Khata Ledger','Digital hisaab-kitaab']};
  const t=titles[section];
  document.getElementById('pageTitle').textContent=t[0];
  document.getElementById('pageSub').textContent=t[1];
  if(section==='orders')loadOrders();
  if(section==='inventory')loadInventory();
  if(section==='distributors')loadDistributors();
  if(section==='khata')loadKhata();
  if(section==='overview')loadOverview();
}

// FORMAT
const fmt=n=>new Intl.NumberFormat('en-IN',{style:'currency',currency:'INR',maximumFractionDigits:0}).format(n||0);
const fmtDate=d=>d?new Date(d).toLocaleDateString('en-IN',{day:'2-digit',month:'short',year:'numeric'}):'—';

// OVERVIEW
async function loadOverview(){
  const uid=currentUser.id;
  const [{count:oc},{count:ic},{count:dc},{count:kc}]=await Promise.all([
    sb.from('orders').select('*',{count:'exact',head:true}).eq('user_id',uid),
    sb.from('inventory').select('*',{count:'exact',head:true}).eq('user_id',uid),
    sb.from('distributors').select('*',{count:'exact',head:true}).eq('user_id',uid),
    sb.from('khata').select('*',{count:'exact',head:true}).eq('user_id',uid),
  ]);
  document.getElementById('ov-orders').textContent=oc||0;
  document.getElementById('ov-inv').textContent=ic||0;
  document.getElementById('ov-dist').textContent=dc||0;
  document.getElementById('ov-khata').textContent=kc||0;
  // Revenue from orders
  const {data:odata}=await sb.from('orders').select('amount').eq('user_id',uid);
  const rev=(odata||[]).reduce((a,r)=>a+(parseFloat(r.amount)||0),0);
  document.getElementById('stat-rev').textContent=fmt(rev);
  document.getElementById('stat-orders').textContent=oc||0;
  document.getElementById('stat-inv').textContent=ic||0;
  document.getElementById('stat-dist').textContent=dc||0;
}

// ORDERS
async function loadOrders(){
  const {data,error}=await sb.from('orders').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
  const tbody=document.getElementById('orders-body');
  if(error||!data||data.length===0){
    tbody.innerHTML=`<tr><td colspan="7"><div class="empty"><div class="empty-icon">📦</div><h3>No orders yet</h3><p>Click "Add Order" to record your first order and start tracking.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=data.map(r=>`
    <tr>
      <td><strong>${r.product_name}</strong></td>
      <td>${r.distributor}</td>
      <td>${r.quantity} ${r.unit||'units'}</td>
      <td>${fmt(r.amount)}</td>
      <td>${fmtDate(r.created_at)}</td>
      <td><span class="badge ${r.status==='Delivered'?'delivered':r.status==='In Transit'?'transit':'pending'}">${r.status}</span></td>
      <td><button class="btn-del" onclick="delOrder('${r.id}')">Delete</button></td>
    </tr>`).join('');
}
async function addOrder(e){
  e.preventDefault();
  const btn=e.target.querySelector('.btn-save');
  btn.textContent='Saving...';btn.disabled=true;
  const {error}=await sb.from('orders').insert({
    user_id:currentUser.id,
    product_name:document.getElementById('o-product').value.trim(),
    distributor:document.getElementById('o-dist').value.trim(),
    quantity:parseInt(document.getElementById('o-qty').value)||1,
    unit:document.getElementById('o-unit').value,
    amount:parseFloat(document.getElementById('o-amount').value)||0,
    status:document.getElementById('o-status').value,
    notes:document.getElementById('o-notes').value.trim()
  });
  btn.textContent='Save Order';btn.disabled=false;
  if(error){toast('Error',error.message,true);return;}
  toast('Order Added','Order recorded successfully.');
  closeModal('modal-order');
  e.target.reset();
  loadOrders();loadOverview();
}
async function delOrder(id){
  if(!confirm('Delete this order?'))return;
  await sb.from('orders').delete().eq('id',id).eq('user_id',currentUser.id);
  toast('Deleted','Order removed.');
  loadOrders();loadOverview();
}

// INVENTORY
async function loadInventory(){
  const {data,error}=await sb.from('inventory').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
  const tbody=document.getElementById('inv-body');
  if(error||!data||data.length===0){
    tbody.innerHTML=`<tr><td colspan="7"><div class="empty"><div class="empty-icon">🏭</div><h3>No stock items yet</h3><p>Add your first product to start tracking inventory.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=data.map(r=>{
    const status=r.quantity<=0?'out':r.quantity<=r.reorder_level?'low':'sufficient';
    const label=r.quantity<=0?'Out of Stock':r.quantity<=r.reorder_level?'Low Stock':'Sufficient';
    return`<tr>
      <td><strong>${r.product_name}</strong><br><small style="color:var(--muted)">${r.sku||'—'}</small></td>
      <td>${r.category||'—'}</td>
      <td>${r.quantity} ${r.unit||'units'}</td>
      <td>${r.reorder_level}</td>
      <td>${fmt(r.buying_price)}</td>
      <td><span class="badge ${status}">${label}</span></td>
      <td><button class="btn-del" onclick="delInv('${r.id}')">Delete</button></td>
    </tr>`;
  }).join('');
}
async function addInventory(e){
  e.preventDefault();
  const btn=e.target.querySelector('.btn-save');
  btn.textContent='Saving...';btn.disabled=true;
  const {error}=await sb.from('inventory').insert({
    user_id:currentUser.id,
    product_name:document.getElementById('i-name').value.trim(),
    sku:document.getElementById('i-sku').value.trim(),
    category:document.getElementById('i-cat').value.trim(),
    quantity:parseInt(document.getElementById('i-qty').value)||0,
    unit:document.getElementById('i-unit').value.trim()||'units',
    reorder_level:parseInt(document.getElementById('i-reorder').value)||10,
    buying_price:parseFloat(document.getElementById('i-buy').value)||0,
    selling_price:parseFloat(document.getElementById('i-sell').value)||0
  });
  btn.textContent='Save Item';btn.disabled=false;
  if(error){toast('Error',error.message,true);return;}
  toast('Item Added','Product added to inventory.');
  closeModal('modal-inv');
  e.target.reset();
  loadInventory();loadOverview();
}
async function delInv(id){
  if(!confirm('Delete this item?'))return;
  await sb.from('inventory').delete().eq('id',id).eq('user_id',currentUser.id);
  toast('Deleted','Item removed.');
  loadInventory();loadOverview();
}

// DISTRIBUTORS
async function loadDistributors(){
  const {data,error}=await sb.from('distributors').select('*').eq('user_id',currentUser.id).order('created_at',{ascending:false});
  const tbody=document.getElementById('dist-body');
  if(error||!data||data.length===0){
    tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="empty-icon">🤝</div><h3>No distributors yet</h3><p>Add your first distributor to start managing your network.</p></div></td></tr>`;
    return;
  }
  tbody.innerHTML=data.map(r=>`
    <tr>
      <td><strong>${r.name}</strong></td>
      <td>${r.phone||'—'}</td>
      <td>${r.location||'—'}</td>
      <td>${r.territory||'—'}</td>
      <td style="font-weight:600;color:${r.balance>=0?'var(--success)':'var(--danger)'}">${fmt(r.balance)}</td>
      <td><button class="btn-del" onclick="delDist('${r.id}')">Delete</button></td>
    </tr>`).join('');
}
async function addDistributor(e){
  e.preventDefault();
  const btn=e.target.querySelector('.btn-save');
  btn.textContent='Saving...';btn.disabled=true;
  const {error}=await sb.from('distributors').insert({
    user_id:currentUser.id,
    name:document.getElementById('d-name').value.trim(),
    phone:document.getElementById('d-phone').value.trim(),
    location:document.getElementById('d-loc').value.trim(),
    territory:document.getElementById('d-territory').value.trim(),
    balance:parseFloat(document.getElementById('d-balance').value)||0,
    notes:document.getElementById('d-notes').value.trim()
  });
  btn.textContent='Save';btn.disabled=false;
  if(error){toast('Error',error.message,true);return;}
  toast('Distributor Added','Contact saved successfully.');
  closeModal('modal-dist');
  e.target.reset();
  loadDistributors();loadOverview();
}
async function delDist(id){
  if(!confirm('Delete this distributor?'))return;
  await sb.from('distributors').delete().eq('id',id).eq('user_id',currentUser.id);
  toast('Deleted','Distributor removed.');
  loadDistributors();loadOverview();
}

// KHATA
async function loadKhata(){
  const uid=currentUser.id;
  const {data,error}=await sb.from('khata').select('*').eq('user_id',uid).order('entry_date',{ascending:false});
  const tbody=document.getElementById('khata-body');
  if(error||!data||data.length===0){
    tbody.innerHTML=`<tr><td colspan="6"><div class="empty"><div class="empty-icon">📒</div><h3>Khata is empty</h3><p>Record your first credit or debit entry to start tracking.</p></div></td></tr>`;
    document.getElementById('k-credit').textContent=fmt(0);
    document.getElementById('k-debit').textContent=fmt(0);
    return;
  }
  let totalCredit=0,totalDebit=0;
  tbody.innerHTML=data.map(r=>{
    if(r.type==='Credit')totalCredit+=parseFloat(r.amount)||0;
    else totalDebit+=parseFloat(r.amount)||0;
    return`<tr>
      <td><strong>${r.party_name}</strong></td>
      <td><span class="badge ${r.type.toLowerCase()}">${r.type}</span></td>
      <td style="font-weight:600">${fmt(r.amount)}</td>
      <td>${r.description||'—'}</td>
      <td>${fmtDate(r.entry_date)}</td>
      <td><button class="btn-del" onclick="delKhata('${r.id}')">Delete</button></td>
    </tr>`;
  }).join('');
  document.getElementById('k-credit').textContent=fmt(totalCredit);
  document.getElementById('k-debit').textContent=fmt(totalDebit);
}
async function addKhata(e){
  e.preventDefault();
  const btn=e.target.querySelector('.btn-save');
  btn.textContent='Saving...';btn.disabled=true;
  const {error}=await sb.from('khata').insert({
    user_id:currentUser.id,
    party_name:document.getElementById('k-party').value.trim(),
    type:document.getElementById('k-type').value,
    amount:parseFloat(document.getElementById('k-amount').value)||0,
    description:document.getElementById('k-desc').value.trim(),
    entry_date:document.getElementById('k-date').value||new Date().toISOString().split('T')[0]
  });
  btn.textContent='Save Entry';btn.disabled=false;
  if(error){toast('Error',error.message,true);return;}
  toast('Entry Added','Khata updated.');
  closeModal('modal-khata');
  e.target.reset();
  loadKhata();loadOverview();
}
async function delKhata(id){
  if(!confirm('Delete this entry?'))return;
  await sb.from('khata').delete().eq('id',id).eq('user_id',currentUser.id);
  toast('Deleted','Entry removed.');
  loadKhata();loadOverview();
}

// INIT
window.addEventListener('DOMContentLoaded',async()=>{
  const {data:{session}}=await sb.auth.getSession();
  if(!session){window.location.href='index.html';return;}
  currentUser=session.user;
  const name=currentUser.user_metadata?.full_name||currentUser.email?.split('@')[0]||'User';
  const first=name.split(' ')[0];
  document.getElementById('sbName').textContent=name;
  document.getElementById('sbInit').textContent=name[0].toUpperCase();
  document.getElementById('topName').textContent=first;
  document.getElementById('dashLogout').addEventListener('click',async()=>{
    await sb.auth.signOut();
    window.location.href='index.html';
  });
  nav('overview');
});
