const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
const source=[...fs.readFileSync('index.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
function app(){
  const elements={};
  const element=()=>({value:'',textContent:'',className:'',children:[],addEventListener(type,handler){(this.handlers??={})[type]=handler;},replaceChildren(){this.children=[];},appendChild(child){this.children.push(child);},add(){},remove(){}});
  const layers=[];
  const group={clearLayers(){layers.length=0;},addLayer(m){layers.push(m);}};
  const storage=new Map();
  const context={console,URL,Option:function(){},Date,setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:id=>elements[id]??=element(),createElement:element,head:{appendChild(){}}},L:{map:()=>({setView(){return this;},addLayer(){},removeLayer(){},fitBounds(){}}),tileLayer:()=>({addTo(){}}),markerClusterGroup:()=>group,marker:coords=>({coords,bindPopup(html){this.html=html;return this;}})}};
  context.window=context;vm.createContext(context);vm.runInContext(source,context);
  return {context,elements,layers,storage,run:code=>vm.runInContext(code,context)};
}
const table={cols:['Restaurant Name','City','Cuisine','Priority','Latitude','Longitude','Website','Google Maps'].map(label=>({label})),rows:[{c:['Café <img src=x onerror=alert(1)>','London','Thai','High',51.5,-0.1,'javascript:alert(1)','https://maps.google.com/?q=venue'].map(v=>({v}))},{c:['Unmapped','York','British','Low','',''].map(v=>({v}))}]};
test('parsing, missing coordinates, filtering and safe popup links',()=>{
 const a=app();a.context.googleSheetLoaded1({table});
 assert.equal(a.layers.length,1);assert.match(a.elements.status.textContent,/1\/2 rows mapped/);
 assert.match(a.layers[0].html,/&lt;img/);assert.doesNotMatch(a.layers[0].html,/href="javascript:/);assert.match(a.layers[0].html,/https:\/\/maps.google.com/);
 a.elements.search.value='cafe';a.run('render()');assert.equal(a.layers.length,1);
 a.elements.search.value='';a.elements.priority.value='Low';a.run('render()');assert.equal(a.layers.length,0);assert.match(a.elements.status.textContent,/1 filtered result/);
 for(const [latitude,longitude] of [['',0],[91,0],[0,181],['NaN',0],['0x33',0]])assert.equal(a.run(`resolveCoordinates(${JSON.stringify({latitude,longitude})})`),null);
 assert.equal(a.run('resolveCoordinates({latitude:0,longitude:0}).lat'),0);
});
test('cached fallback warning survives filters and successful refresh clears it',()=>{
 const a=app();a.storage.set('restaurantBucketMap.sheetData.v3',JSON.stringify({savedAt:Date.now(),items:[{name:'Cached',latitude:51,longitude:0}]}));
 a.context.googleSheetLoaded1({status:'error',errors:[{message:'offline'}]});
 a.run('render()');assert.match(a.elements.status.textContent,/cached.*Live refresh failed: offline/);
 a.run('loadSheet()');a.context.googleSheetLoaded3({table});assert.doesNotMatch(a.elements.status.textContent,/failed|cached/);
});
test('late response after timeout cannot overwrite a newer refresh',()=>{
 const a=app();const old=a.context.googleSheetLoaded1;
 a.run("failLoad('timeout'); loadSheet()");old({table});assert.equal(a.layers.length,0);
 a.context.googleSheetLoaded2({table});assert.equal(a.layers.length,1);
});
test('failed refresh retains loaded records even when storage is unavailable',()=>{
 const a=app();a.context.localStorage.setItem=()=>{throw Error('blocked')};a.context.googleSheetLoaded1({table});
 a.run("failLoad('offline'); render()");assert.equal(a.layers.length,1);assert.match(a.elements.status.textContent,/Live refresh failed: offline/);
});

test('invalid cache and malformed table fail visibly and allow retry',()=>{
 const a=app();a.storage.set('restaurantBucketMap.sheetData.v3',JSON.stringify({savedAt:Date.now(),items:[null]}));
 a.context.googleSheetLoaded1({table:{}});assert.match(a.elements.status.textContent,/unexpected format/);assert.equal(a.elements.refresh.disabled,false);assert.equal(a.layers.length,0);
});


test('nearby radius filters and sorts mapped records without hiding unmapped counts',()=>{
 const a=app();
 a.run("locationOrigin={lat:51.5,lon:-0.1}; document.getElementById('radius').value='10'");
 a.context.googleSheetLoaded1({table});
 assert.equal(a.layers.length,1);
 assert.equal(a.elements['nearby-list'].children.length,1);
 assert.match(a.elements['nearby-list'].children[0].children[0].textContent,/0.0 miles/);
 assert.match(a.elements.status.textContent,/missing or invalid/);
 a.run('locationOrigin={lat:55,lon:0}; render()');assert.equal(a.layers.length,0);
 assert.match(a.elements['nearby-list'].textContent,/No mapped restaurants/);
 assert.ok(Math.abs(a.run('distanceMiles({lat:0,lon:0},{lat:0,lon:1})')-69.09)<0.1);
});

test('place lookup, permission denial and clearing location',async()=>{
 const a=app();
 a.context.AbortSignal=AbortSignal;
 a.context.URLSearchParams=URLSearchParams;
 a.context.navigator={geolocation:{getCurrentPosition(success,failure){failure({code:1});}}};
 a.context.fetch=async url=>{assert.equal(url.hostname,'nominatim.openstreetmap.org');assert.equal(url.searchParams.get('q'),'London');return {ok:true,json:async()=>[{display_name:'London <test>',lat:'51.5',lon:'-0.1'}]};};
 a.context.L.circle=()=>({getBounds(){return [];}});
 a.context.L.circleMarker=()=>({addTo(){return this;},bindPopup(){return this;}});
 a.run(fs.readFileSync('location.js','utf8'));
 a.run("document.getElementById('place').value='London'");await a.elements['location-form'].handlers.submit({preventDefault(){}});
 assert.equal(a.elements['place-results'].children[0].textContent,'London <test>');
 a.elements['place-results'].children[0].handlers.click();assert.equal(a.run('locationOrigin.lat'),51.5);
 a.elements['clear-location'].handlers.click();assert.equal(a.run('locationOrigin'),null);
 a.elements['near-me'].handlers.click();assert.match(a.elements['location-status'].textContent,/permission was denied/);
});

test('manifest assets and service-worker cache stay within repository subpath',()=>{
 const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
 const base='https://example.com/restaurant-bucket-list/';
 assert.equal(new URL(manifest.start_url,base).pathname,'/restaurant-bucket-list/');
 assert.equal(new URL(manifest.scope,base).pathname,'/restaurant-bucket-list/');
 for(const icon of manifest.icons) assert.ok(fs.existsSync(icon.src));
 const listeners={};let added=[];
 const context={URL,Request,Promise,caches:{open:async()=>({addAll:async paths=>{added=paths;}})},self:{addEventListener:(name,fn)=>listeners[name]=fn}};
 vm.createContext(context);vm.runInContext(fs.readFileSync('sw.js','utf8'),context);
 let pending;listeners.install({waitUntil:p=>pending=p});
 return pending.then(()=>{assert.ok(added.length>10);for(const path of added){assert.ok(fs.existsSync(path));assert.ok(new URL(path,base).pathname.startsWith('/restaurant-bucket-list/'));}});
});
