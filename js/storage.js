import {empty,validate} from './rules.js';
let db;
export async function load(){
 db=await new Promise((resolve,reject)=>{const q=indexedDB.open('momentum-worklog',1);q.onupgradeneeded=()=>q.result.createObjectStore('state');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 const raw=await new Promise((resolve,reject)=>{const q=db.transaction('state').objectStore('state').get('main');q.onsuccess=()=>resolve(q.result);q.onerror=()=>reject(q.error)});
 if(!raw)return empty();
 if(raw.schemaVersion===1)await new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');const store=tx.objectStore('state');const q=store.get('pre-v2-backup');q.onsuccess=()=>{if(!q.result)store.put(raw,'pre-v2-backup')};tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)});
 return validate(raw);
}
export async function save(s){return new Promise((resolve,reject)=>{const tx=db.transaction('state','readwrite');tx.objectStore('state').put(s,'main');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error)})}
