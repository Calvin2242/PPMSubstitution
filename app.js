import {initializeApp} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {getAuth,onAuthStateChanged,signInWithEmailAndPassword,signOut} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import {getFirestore,collection,getDocs,doc,getDoc,setDoc,deleteDoc,writeBatch} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";
import {firebaseConfig} from "./firebase-config.js";

const app=initializeApp(firebaseConfig),auth=getAuth(app),db=getFirestore(app);

const $=s=>document.querySelector(s);
const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const DAYS=["Mon","Tue","Wed","Thu","Fri"];
const DM={Mon:"Isnin",Tue:"Selasa",Wed:"Rabu",Thu:"Khamis",Fri:"Jumaat"};
const MS={isnin:"Mon",selasa:"Tue",rabu:"Wed",khamis:"Thu",jumaat:"Fri",mon:"Mon",tue:"Tue",wed:"Wed",thu:"Thu",fri:"Fri",monday:"Mon",tuesday:"Tue",wednesday:"Wed",thursday:"Thu",friday:"Fri"};
const BULAN=["Januari","Februari","Mac","April","Mei","Jun","Julai","Ogos","September","Oktober","November","Disember"];
const maxP=d=>d==="Fri"?8:10;
const PRESET={tiada:"Tiada ganti, kelas terlibat dengan aktiviti lain",pantau:"Pantauan Guru Kelas Sebelah dan PPM"};

let ppms=[],cur={absent:[],rows:[]},gridId=null,gridSlots={};

/* ---------- Auth ---------- */
onAuthStateChanged(auth,async u=>{
  $("#login").hidden=!!u;$("#top").hidden=!u;$("#app").hidden=!u;
  if(u){await loadPpms();$("#dt").value=$("#dt").value||localDate();await loadDay();renderPpm();}
});
$("#btnLogin").onclick=async()=>{
  $("#loginErr").textContent="";
  try{await signInWithEmailAndPassword(auth,$("#em").value,$("#pw").value)}
  catch(e){$("#loginErr").textContent="Log masuk gagal. Semak e-mel dan kata laluan."}
};
$("#btnOut").onclick=()=>signOut(auth);
setTimeout(()=>{if(!auth.currentUser)$("#login").hidden=false},800);

document.querySelectorAll("nav button[data-tab]").forEach(b=>b.onclick=()=>{
  document.querySelectorAll("nav button[data-tab]").forEach(x=>x.classList.toggle("on",x===b));
  $("#tab-harian").hidden=b.dataset.tab!=="harian";$("#tab-ppm").hidden=b.dataset.tab!=="ppm";
});

/* ---------- Data ---------- */
function localDate(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`}
function dayKey(){const g=new Date($("#dt").value+"T00:00").getDay();return g>=1&&g<=5?DAYS[g-1]:null}
async function loadPpms(){
  const s=await getDocs(collection(db,"ppm"));
  ppms=s.docs.map(d=>({id:d.id,...d.data()})).sort((a,b)=>a.nama.localeCompare(b.nama));
}
async function loadDay(){
  const s=await getDoc(doc(db,"subs",$("#dt").value));
  cur=s.exists()?{absent:s.data().absent||[],rows:s.data().rows||[]}:{absent:[],rows:[]};
  $("#saveMsg").textContent=s.exists()?"Dimuatkan daripada simpanan.":"";
  renderDay();
}
$("#dt").onchange=loadDay;

/* ---------- Harian ---------- */
function renderDay(){
  const d=dayKey();
  $("#dayInfo").textContent=d?DM[d]+", waktu 1 hingga "+maxP(d):"Hujung minggu: tiada jadual PPM.";
  $("#absBox").hidden=!d;
  const taken=cur.absent.map(a=>a.ppm);
  $("#absSel").innerHTML='<option value="">Pilih PPM</option>'+ppms.filter(p=>p.aktif!==false&&!taken.includes(p.nama)).map(p=>`<option>${esc(p.nama)}</option>`).join("");
  $("#absChips").innerHTML=cur.absent.map((a,i)=>`<span class="chip">${esc(a.ppm)} (${esc(a.alasan||"tiada alasan")})<button data-rm="${i}" title="Buang">&times;</button></span>`).join("");
  document.querySelectorAll("[data-rm]").forEach(b=>b.onclick=()=>{
    const a=cur.absent.splice(+b.dataset.rm,1)[0];cur.rows=cur.rows.filter(r=>r.ppm!==a.ppm);renderDay();
  });
  if(!cur.rows.length){$("#rowsBox").innerHTML='<p class="mut">Tambah PPM yang tidak hadir untuk menjana senarai gantian.</p>';return}
  $("#rowsBox").innerHTML=`<table><thead><tr><th>Tidak hadir</th><th>Waktu</th><th>Subjek</th><th>Kelas</th><th>Jenis</th><th>Gantian</th><th>Nota</th></tr></thead><tbody>`+
  cur.rows.map((r,i)=>{
    const opts=freePpms(r);
    if(r.gantian&&!opts.some(p=>p.nama===r.gantian))opts.unshift({nama:r.gantian});
    return `<tr><td>${esc(r.ppm)}</td><td>${r.waktu}</td><td>${esc(r.subjek)}</td><td>${esc(r.kelas)}</td>
    <td><select data-i="${i}" data-f="jenis"><option value="ganti"${r.jenis==="ganti"?" selected":""}>Ganti</option><option value="tiada"${r.jenis==="tiada"?" selected":""}>Tiada ganti</option><option value="pantau"${r.jenis==="pantau"?" selected":""}>Pantauan</option></select></td>
    <td><select data-i="${i}" data-f="gantian" ${r.jenis!=="ganti"?"disabled":""}><option value="">Pilih</option>${opts.map(p=>`<option${p.nama===r.gantian?" selected":""}>${esc(p.nama)}</option>`).join("")}</select></td>
    <td><input data-i="${i}" data-f="nota" value="${esc(r.nota)}"></td></tr>`}).join("")+"</tbody></table>";
  document.querySelectorAll("#rowsBox [data-f]").forEach(el=>el.onchange=()=>{
    const r=cur.rows[+el.dataset.i],f=el.dataset.f;r[f]=el.value;
    if(f==="jenis"){
      if(el.value!=="ganti")r.gantian="";
      const was=Object.values(PRESET);
      if(!r.nota||was.includes(r.nota))r.nota=PRESET[el.value]||"";
    }
    renderDay();
  });
}
function freePpms(row){
  const d=dayKey();
  return ppms.filter(p=>p.aktif!==false&&!cur.absent.some(a=>a.ppm===p.nama)&&!(p.slots&&p.slots[`${d}-${row.waktu}`])
    &&!cur.rows.some(r=>r!==row&&r.waktu===row.waktu&&r.gantian===p.nama));
}
$("#btnAbs").onclick=()=>{
  const n=$("#absSel").value,d=dayKey();if(!n||!d)return;
  const alasan=$("#absWhy").value.trim(),p=ppms.find(x=>x.nama===n);let c=0;
  cur.absent.push({ppm:n,alasan});
  for(let t=1;t<=maxP(d);t++){
    const s=p.slots&&p.slots[`${d}-${t}`];
    if(s){cur.rows.push({ppm:n,waktu:t,alasan,subjek:s.subjek,kelas:s.kelas,jenis:"ganti",gantian:"",nota:""});c++}
  }
  $("#absWhy").value="";renderDay();
  if(!c)$("#saveMsg").textContent=n+" tiada pelajaran pada hari "+DM[d]+".";
};
$("#btnSave").onclick=async()=>{
  try{await setDoc(doc(db,"subs",$("#dt").value),cur);$("#saveMsg").textContent="Disimpan."}
  catch(e){$("#saveMsg").textContent="Gagal menyimpan: "+e.message}
};
$("#btnPrint").onclick=()=>{
  const [y,m,dd]=$("#dt").value.split("-"),d=dayKey();
  const names=cur.absent.map(a=>a.ppm).join(" dan ");
  let h=`<h1>Penggantian</h1><p><b>${d?DM[d]:""} ${+dd} ${BULAN[+m-1]} ${y}</b></p><p>Pembantu Pengurusan Murid (PPKI) yang tidak hadir: <b>${esc(names)||"-"}</b></p>
  <table><thead><tr><th>Tidak hadir</th><th>Waktu</th><th>Alasan</th><th>Subjek</th><th>Kelas</th><th>Gantian</th><th>Tandatangan</th><th>Nota</th></tr></thead><tbody>`;
  cur.absent.forEach(a=>{
    const rs=cur.rows.filter(r=>r.ppm===a.ppm);
    rs.forEach((r,i)=>{h+=`<tr>${i?"":`<td class="nm" rowspan="${rs.length}">${esc(a.ppm)}</td>`}<td>${r.waktu}</td><td>${esc(r.alasan)}</td><td>${esc(r.subjek)}</td><td>${esc(r.kelas)}</td><td>${esc(r.gantian)}</td><td style="width:90px"></td><td>${esc(r.nota)}</td></tr>`});
  });
  $("#printArea").innerHTML=h+"</tbody></table>";window.print();
};

/* ---------- CSV ---------- */
function parseCSV(t){
  t=t.replace(/^\uFEFF/,"");
  const first=t.split(/\r?\n/)[0],sep=first.includes(";")&&!first.includes(",")?";":",";
  const rows=[];let r=[],c="",q=false;
  for(let i=0;i<t.length;i++){
    const ch=t[i];
    if(q){if(ch==='"'){if(t[i+1]==='"'){c+='"';i++}else q=false}else c+=ch}
    else if(ch==='"')q=true;
    else if(ch===sep){r.push(c);c=""}
    else if(ch==="\n"||ch==="\r"){if(ch==="\r"&&t[i+1]==="\n")i++;r.push(c);rows.push(r);r=[];c=""}
    else c+=ch;
  }
  if(c||r.length){r.push(c);rows.push(r)}
  return rows.filter(x=>x.some(v=>v.trim()));
}
const q=v=>/[",\n]/.test(v)?'"'+v.replace(/"/g,'""')+'"':v;
function download(name,text){
  const a=document.createElement("a");
  a.href=URL.createObjectURL(new Blob(["\uFEFF"+text],{type:"text/csv;charset=utf-8"}));
  a.download=name;a.click();URL.revokeObjectURL(a.href);
}
$("#btnSample").onclick=()=>download("sampel-jadual-ppm.csv",
`nama,hari,mula,tamat,kelas,subjek
PPM CONTOH 1,Isnin,1,3,BIJAK,PK
PPM CONTOH 1,Isnin,9,10,CEKAL KSSM 5,PM
PPM CONTOH 1,Selasa,4,6,RAJIN,KOM
PPM CONTOH 1,Jumaat,1,2,EFISIEN KSSM 3,PM
PPM CONTOH 2,Isnin,4,5,GIGIH KSSM 2,BI
PPM CONTOH 2,Rabu,7,8,INTELEK KSSM 4,PSV
`);
$("#btnExport").onclick=()=>{
  let out="nama,hari,mula,tamat,kelas,subjek\n";
  ppms.forEach(p=>DAYS.forEach(d=>{
    let run=null;
    for(let t=1;t<=maxP(d)+1;t++){
      const s=t<=maxP(d)&&p.slots&&p.slots[`${d}-${t}`];
      if(run&&(!s||s.kelas!==run.kelas||s.subjek!==run.subjek)){out+=[p.nama,DM[d],run.mula,t-1,run.kelas,run.subjek].map(v=>q(String(v))).join(",")+"\n";run=null}
      if(s&&!run)run={mula:t,kelas:s.kelas,subjek:s.subjek};
    }
  }));
  download("jadual-semua-ppm.csv",out);
};
$("#btnImport").onclick=async()=>{
  const msg=$("#impMsg"),f=$("#csvFile").files[0];msg.textContent="";
  if(!f){msg.textContent="Pilih fail CSV dahulu.";return}
  const rows=parseCSV(await f.text()),head=rows.shift().map(h=>h.trim().toLowerCase());
  const ix=k=>head.indexOf(k),need=["nama","hari","mula","tamat","kelas","subjek"];
  const miss=need.filter(k=>ix(k)<0);
  if(miss.length){msg.textContent="Lajur tiada: "+miss.join(", ")+". Gunakan fail sampel sebagai panduan.";return}
  const data={},errs=[];
  rows.forEach((r,n)=>{
    const L="Baris "+(n+2)+": ",nama=(r[ix("nama")]||"").trim().toUpperCase(),
      d=MS[(r[ix("hari")]||"").trim().toLowerCase()],a=parseInt(r[ix("mula")]),b=parseInt(r[ix("tamat")]),
      kelas=(r[ix("kelas")]||"").trim(),subjek=(r[ix("subjek")]||"").trim();
    if(!nama)return errs.push(L+"nama kosong");
    if(!d)return errs.push(L+"hari tidak sah ("+r[ix("hari")]+")");
    if(!(a>=1&&b>=a&&b<=maxP(d)))return errs.push(L+"waktu tidak sah ("+DM[d]+" 1 hingga "+maxP(d)+")");
    if(!kelas)return errs.push(L+"kelas kosong");
    const s=data[nama]=data[nama]||{};
    for(let t=a;t<=b;t++){
      if(s[`${d}-${t}`])errs.push(L+"bertindih dengan baris lain ("+DM[d]+" waktu "+t+")");
      s[`${d}-${t}`]={kelas,subjek};
    }
  });
  if(errs.length){msg.textContent="Tiada data disimpan. Betulkan ralat ini:\n"+errs.slice(0,8).join("\n")+(errs.length>8?"\n...dan "+(errs.length-8)+" lagi":"");return}
  const names=Object.keys(data);
  if(!names.length){msg.textContent="Fail kosong.";return}
  if(!confirm("Simpan jadual untuk "+names.length+" PPM? Jadual lama mereka akan diganti."))return;
  const batch=writeBatch(db);
  names.forEach(n=>{
    const id=n.toLowerCase().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"")||"ppm"+Date.now();
    const old=ppms.find(p=>p.id===id);
    batch.set(doc(db,"ppm",id),{nama:n,aktif:old?old.aktif!==false:true,slots:data[n]});
  });
  try{await batch.commit();msg.className="mut";msg.textContent=names.length+" PPM disimpan.";$("#csvFile").value="";await loadPpms();renderPpm();renderDay()}
  catch(e){msg.className="err";msg.textContent="Gagal menyimpan: "+e.message}
};

/* ---------- PPM list and grid ---------- */
function renderPpm(){
  if(!ppms.length){$("#ppmList").innerHTML='<p class="mut">Belum ada PPM. Muat turun sampel CSV, isi, dan muat naik.</p>';return}
  $("#ppmList").innerHTML=`<table><thead><tr><th>Nama</th><th>Bil. waktu</th><th>Aktif</th><th></th></tr></thead><tbody>`+
  ppms.map(p=>`<tr><td>${esc(p.nama)}</td><td>${Object.keys(p.slots||{}).length}</td>
  <td><input type="checkbox" data-act="${p.id}" ${p.aktif!==false?"checked":""}></td>
  <td><button data-edit="${p.id}">Edit jadual</button> <button class="d" data-del="${p.id}">Padam</button></td></tr>`).join("")+"</tbody></table>";
  document.querySelectorAll("[data-act]").forEach(c=>c.onchange=async()=>{
    await setDoc(doc(db,"ppm",c.dataset.act),{aktif:c.checked},{merge:true});await loadPpms();renderDay();
  });
  document.querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>openGrid(b.dataset.edit));
  document.querySelectorAll("[data-del]").forEach(b=>b.onclick=async()=>{
    const p=ppms.find(x=>x.id===b.dataset.del);
    if(confirm("Padam "+p.nama+" dan jadualnya?")){await deleteDoc(doc(db,"ppm",p.id));gridId=null;$("#gridCard").hidden=true;await loadPpms();renderPpm();renderDay()}
  });
}
function openGrid(id){
  const p=ppms.find(x=>x.id===id);gridId=id;gridSlots=JSON.parse(JSON.stringify(p.slots||{}));
  $("#gridTitle").textContent="Jadual "+p.nama;$("#gridCard").hidden=false;
  let h="<table><thead><tr><th>Waktu</th>"+DAYS.map(d=>`<th>${DM[d]}</th>`).join("")+"</tr></thead><tbody>";
  for(let t=1;t<=10;t++){
    h+=`<tr><th>${t}</th>`+DAYS.map(d=>{
      if(t>maxP(d))return '<td class="na"></td>';
      const s=gridSlots[`${d}-${t}`];
      return `<td><input data-k="${d}-${t}" value="${s?esc(s.kelas+(s.subjek?" | "+s.subjek:"")):""}"></td>`;
    }).join("")+"</tr>";
  }
  $("#gridBox").innerHTML=h+"</tbody></table>";
  document.querySelectorAll("#gridBox [data-k]").forEach(i=>i.onchange=()=>{
    const [k,s]=[i.dataset.k,i.value.trim()];
    if(!s)delete gridSlots[k];
    else{const [a,b]=s.split("|");gridSlots[k]={kelas:a.trim().toUpperCase(),subjek:(b||"").trim().toUpperCase()}}
  });
  $("#gridCard").scrollIntoView({behavior:"smooth"});
}
$("#btnGridSave").onclick=async()=>{
  if(!gridId)return;
  const p=ppms.find(x=>x.id===gridId);
  await setDoc(doc(db,"ppm",gridId),{nama:p.nama,aktif:p.aktif!==false,slots:gridSlots});
  await loadPpms();renderPpm();renderDay();alert("Jadual disimpan.");
};
