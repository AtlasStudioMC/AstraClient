/* Astra engine: unpack games, install theme pack, write cosmetics into the game profile */
async function unpack(id,onProgress){
  const el=document.getElementById(id);
  let stream;
  if(el){
    // offline build: game is embedded as base64 (decoded in chunks to save memory)
    const b64=el.textContent,CH=4*1024*1024;
    stream=new ReadableStream({start(ctl){let i=0,carry='';(function next(){
      if(i>=b64.length){ctl.close();return}
      let chunk=carry+b64.slice(i,i+CH).replace(/\s+/g,'');i+=CH;
      const cut=chunk.length-chunk.length%4;carry=chunk.slice(cut);chunk=chunk.slice(0,cut);
      const bin=atob(chunk),u=new Uint8Array(bin.length);for(let k=0;k<bin.length;k++)u[k]=bin.charCodeAt(k);
      ctl.enqueue(u);setTimeout(next,0);
    })()}});
  }else{
    // hosted build: download the gzipped game file
    const res=await fetch('games/'+id+'.bin?v=6d6e433249',{cache:'no-cache'});
    if(!res.ok)throw new Error('could not download game ('+res.status+')');
    const total=+res.headers.get('content-length')||0;let got=0;
    const reader=res.body.getReader();
    stream=new ReadableStream({async pull(ctl){const {done,value}=await reader.read();if(done){ctl.close();return}
      got+=value.length;if(total&&onProgress)onProgress(Math.min(100,Math.round(got/total*100)));ctl.enqueue(value)}});
  }
  return await new Response(stream.pipeThrough(new DecompressionStream('gzip'))).text();
}
// ---- auto-install the Astra title background resource pack ----
const PACK='AstraBackground';
const GAMES={
  v18:{dbs:['_net_lax1dude_eaglercraft_v1_8_internal_PlatformFilesystem_1_8_8_resourcePacks'],ls:'_eaglercraftX.g',fmt:1},
  v18w:{dbs:['_net_lax1dude_eaglercraft_v1_8_internal_PlatformFilesystem_1_8_8_resourcePacks'],ls:'_eaglercraftX.g',fmt:1},
  v112:{dbs:['_net_lax1dude_eaglercraft_v1_8_internal_PlatformFilesystem_1_12_2_'],ls:'_eaglercraft_1.12.g',fmt:3}
};
const idb=r=>new Promise((ok,no)=>{r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
async function installPack(v){
  const g=GAMES[v];
  for(const name of g.dbs)await writePack(name,g.fmt);
  await enablePack(g.ls);
}
async function writePack(dbName,fmt){
  const enc=new TextEncoder(),dec=new TextDecoder();
  const req=indexedDB.open(dbName,1);
  req.onupgradeneeded=()=>req.result.createObjectStore('filesystem',{keyPath:['path']});
  const db=await idb(req);
  const files=JSON.parse(document.getElementById('packfiles').textContent);
  const bin=k=>Uint8Array.from(atob(files[k]),c=>c.charCodeAt(0)).buffer;
  const png=bin('panorama.png'),T='assets/minecraft/textures/gui/';
  const store=()=>db.transaction('filesystem','readwrite').objectStore('filesystem');
  const put=(path,data)=>idb(store().put({path,data}));
  const base='resourcepacks/'+PACK+'/';
  await put(base+'pack.mcmeta',enc.encode(JSON.stringify({pack:{pack_format:fmt,description:'Astra Client menu theme'}})).buffer);
  await put(base+'pack.png',png);
  for(let i=0;i<6;i++)await put(base+T+'title/background/panorama_'+i+'.png',png);
  await put(base+T+'widgets.png',bin('widgets.png'));
  await put(base+T+'title/minecraft.png',bin('minecraft.png'));
  await put(base+T+'title/edition.png',bin('edition.png'));
  await put(base+'assets/minecraft/texts/splashes.txt',bin('splashes.txt'));
  // add to manifest
  const row=await idb(store().get(['resourcepacks/manifest.json']));
  let man={resourcePacks:[]};
  try{if(row)man=JSON.parse(dec.decode(row.data))}catch(e){}
  if(!Array.isArray(man.resourcePacks))man.resourcePacks=[];
  if(!man.resourcePacks.some(p=>p.folder===PACK))
    man.resourcePacks.push({folder:PACK,name:'Astra Background',timestamp:Date.now(),domains:['minecraft']});
  await put('resourcepacks/manifest.json',enc.encode(JSON.stringify(man)).buffer);
  db.close();
}
const pipe=async(bytes,t)=>new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(t)).arrayBuffer());
async function enablePack(lsKey){
  const enc=new TextEncoder(),dec=new TextDecoder();
  try{
    const b64=localStorage.getItem(lsKey);
    let bytes=b64?Uint8Array.from(atob(b64),c=>c.charCodeAt(0)):new Uint8Array(0);
    const gz=bytes[0]===0x1f&&bytes[1]===0x8b; // 1.8 gzips its options
    if(gz)bytes=await pipe(bytes,new DecompressionStream('gzip'));
    const lines=bytes.length?dec.decode(bytes).split('\n'):[];
    const idx=lines.findIndex(l=>l.startsWith('resourcePacks:'));
    let packs=[];
    if(idx>=0){try{packs=JSON.parse(lines[idx].slice(14))}catch(e){}}
    if(packs.includes(PACK))return;
    packs.push(PACK);
    const line='resourcePacks:'+JSON.stringify(packs);
    if(idx>=0)lines[idx]=line;else lines.unshift(line);
    let out=enc.encode(lines.join('\n'));
    if(gz||lsKey==='_eaglercraftX.g')out=await pipe(out,new CompressionStream('gzip'));
    let bin='';for(const c of out)bin+=String.fromCharCode(c);
    localStorage.setItem(lsKey,btoa(bin));
  }catch(e){console.warn('Astra: could not enable pack',e)}
}

// ---- cosmetics: write username + cape straight into the Eaglercraft profile (NBT in localStorage) ----
const PROFILE_KEYS={v18:'_eaglercraftX.p',v18w:'_eaglercraftX.p',v112:'_eaglercraft_1.12.p'};
function nbtRead(bytes){
  const dv=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);let p=0;const dec=new TextDecoder();
  const str=()=>{const n=dv.getUint16(p);p+=2;const s=dec.decode(bytes.subarray(p,p+n));p+=n;return s};
  function payload(t){
    switch(t){
      case 1:return{t,v:dv.getInt8(p++)};
      case 2:{const v=dv.getInt16(p);p+=2;return{t,v}}
      case 3:{const v=dv.getInt32(p);p+=4;return{t,v}}
      case 4:{const v=dv.getBigInt64(p);p+=8;return{t,v}}
      case 5:{const v=dv.getFloat32(p);p+=4;return{t,v}}
      case 6:{const v=dv.getFloat64(p);p+=8;return{t,v}}
      case 7:{const n=dv.getInt32(p);p+=4;const v=bytes.slice(p,p+n);p+=n;return{t,v}}
      case 8:return{t,v:str()};
      case 9:{const et=dv.getInt8(p++),n=dv.getInt32(p);p+=4;const v=[];for(let i=0;i<n;i++)v.push(payload(et));return{t,et,v}}
      case 10:{const v=new Map();for(;;){const ct=dv.getInt8(p++);if(ct===0)break;const k=str();v.set(k,payload(ct))}return{t,v}}
      case 11:{const n=dv.getInt32(p);p+=4;const v=[];for(let i=0;i<n;i++){v.push(dv.getInt32(p));p+=4}return{t,v}}
    }
    throw new Error('bad nbt tag '+t);
  }
  const t=dv.getInt8(p++);str();return payload(t);
}
function nbtWrite(root){
  const out=[];const enc=new TextEncoder();
  const u8=b=>out.push(b&255),u16=n=>{u8(n>>8);u8(n)},i32=n=>{u8(n>>>24);u8(n>>>16);u8(n>>>8);u8(n)};
  const str=s=>{const b=enc.encode(s);u16(b.length);for(const x of b)u8(x)};
  function payload(tag){
    const {t,v}=tag,dv=new DataView(new ArrayBuffer(8));
    switch(t){
      case 1:u8(v);break;case 2:u16(v);break;case 3:i32(v);break;
      case 4:dv.setBigInt64(0,v);for(let i=0;i<8;i++)u8(dv.getUint8(i));break;
      case 5:dv.setFloat32(0,v);for(let i=0;i<4;i++)u8(dv.getUint8(i));break;
      case 6:dv.setFloat64(0,v);for(let i=0;i<8;i++)u8(dv.getUint8(i));break;
      case 7:i32(v.length);for(const x of v)u8(x);break;
      case 8:str(v);break;
      case 9:u8(tag.et||0);i32(v.length);v.forEach(payload);break;
      case 10:for(const [k,c] of v){u8(c.t);str(k);payload(c)}u8(0);break;
      case 11:i32(v.length);v.forEach(i32);break;
    }
  }
  u8(10);str('');payload(root);return new Uint8Array(out);
}
async function applyCosmetics(v,cos){
  const key=PROFILE_KEYS[v];if(!key)return;
  try{
    const raw=localStorage.getItem(key);
    let root,gz=true;
    if(raw){
      let bytes=Uint8Array.from(atob(raw),c=>c.charCodeAt(0));
      gz=bytes[0]===0x1f&&bytes[1]===0x8b; // the game saves profiles gzipped
      if(gz)bytes=await pipe(bytes,new DecompressionStream('gzip'));
      root=nbtRead(bytes);
    }
    else root={t:10,v:new Map([['skins',{t:9,et:0,v:[]}],['presetSkin',{t:3,v:0}],['customSkin',{t:3,v:-1}]])};
    const m=root.v;
    if(cos.username&&/^[A-Za-z0-9_]{3,16}$/.test(cos.username))m.set('username',{t:8,v:cos.username});
    else if(!m.has('username'))m.set('username',{t:8,v:'AstraPlayer'+Math.floor(Math.random()*9000+1000)});
    let capes=m.get('capes');if(!capes||capes.t!==9)capes={t:9,et:10,v:[]};
    // drop any old Astra capes, then add the chosen one
    const before=capes.v.length;
    capes.v=capes.v.filter(c=>!(c.v.get('name')?.v||'').startsWith('Astra: '));
    capes.et=10;
    const cape=(window.ASTRA_CAPES||[]).find(c=>c.id===cos.cape);
    if(cape){
      capes.v.push({t:10,v:new Map([['name',{t:8,v:'Astra: '+cape.name}],['data',{t:7,v:Uint8Array.from(atob(cape.data),c=>c.charCodeAt(0))}]])});
      m.set('presetCape',{t:3,v:-1});m.set('customCape',{t:3,v:capes.v.length-1});
    }else if(before!==capes.v.length||(m.get('customCape')?.v??-1)>=capes.v.length){
      m.set('presetCape',{t:3,v:0});m.set('customCape',{t:3,v:-1});
    }
    m.set('capes',capes);
    let bytes=nbtWrite(root);
    if(gz)bytes=await pipe(bytes,new CompressionStream('gzip'));
    let bin='';for(const x of bytes)bin+=String.fromCharCode(x);
    localStorage.setItem(key,btoa(bin));
  }catch(e){console.warn('Astra: could not apply cosmetics',e)}
}
// ---- Ladue resource pack, built in for 26.2 ----
// Writes the pack into the game's own file store and turns it on, once per browser, so a
// player who later switches it off in Options keeps it off.
const LADUE_PACK='ladue';
const LADUE_DB='_net_lax1dude_eaglercraft_v1_8_internal_PlatformFilesystem_1_8_8_ladue_worlds_26_2';
async function installLaduePack(){
  const db=await new Promise((ok,no)=>{const r=indexedDB.open(LADUE_DB,1);
    r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('filesystem'))r.result.createObjectStore('filesystem',{keyPath:['path']})};
    r.onsuccess=()=>ok(r.result);r.onerror=()=>no(r.error)});
  const files=await (await fetch('games/ladue-pack.json?v=23672a4f78',{cache:'no-cache'})).json();
  await new Promise((ok,no)=>{const tx=db.transaction('filesystem','readwrite'),st=tx.objectStore('filesystem');
    const put=(path,bytes)=>st.put({path,data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)});
    put('resourcepacks/.eaglerfsdir',new Uint8Array(0));
    put('resourcepacks/'+LADUE_PACK+'/.eaglerfsdir',new Uint8Array(0));
    for(const [name,b64] of Object.entries(files))put('resourcepacks/'+LADUE_PACK+'/'+name,Uint8Array.from(atob(b64),c=>c.charCodeAt(0)));
    // first launch only: put the Ladue server in Multiplayer so players just click Join
    const has=st.get(['servers.dat']);has.onsuccess=()=>{if(!has.result)put('servers.dat',nbtWrite({t:10,v:new Map([['servers',{t:9,et:10,v:[{t:10,v:new Map([['name',{t:8,v:'Ladue Horton Watkins'}],['ip',{t:8,v:'ladue.cc.cd'}]])}]}]])}))};
    tx.oncomplete=ok;tx.onerror=()=>no(tx.error)});
  db.close();
  if(localStorage.getItem('ladue.pack.enabled'))return; // only switch it on the first time
  const KEY='_eaglercraftX.g',entry='"file/'+LADUE_PACK+'"';
  let txt='version:4903\n';
  const cur=localStorage.getItem(KEY);
  if(cur)txt=await new Response(new Blob([Uint8Array.from(atob(cur),c=>c.charCodeAt(0))]).stream().pipeThrough(new DecompressionStream('gzip'))).text();
  const lines=txt.split('\n');const i=lines.findIndex(l=>l.startsWith('resourcePacks:'));
  if(i<0)lines.splice(1,0,'resourcePacks:["vanilla",'+entry+']');
  else if(!lines[i].includes(entry))lines[i]=lines[i].replace(/\]\s*$/,(lines[i].includes('[]')?'':',')+entry+']');
  const gz=new Uint8Array(await new Response(new Blob([lines.join('\n')]).stream().pipeThrough(new CompressionStream('gzip'))).arrayBuffer());
  let bin='';for(const x of gz)bin+=String.fromCharCode(x);
  localStorage.setItem(KEY,btoa(bin));
  localStorage.setItem('ladue.pack.enabled','1');
}

