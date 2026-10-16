const vm=require('node:vm');
const fs=require('node:fs');
const source=[...fs.readFileSync('index.html','utf8').matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]).join('\n');
function app(){
  const elements={};
  const element=()=>({value:'',textContent:'',className:'',children:[],addEventListener(type,handler){(this.handlers??={})[type]=handler;},replaceChildren(){this.children=[];this.value='';this.textContent='';},appendChild(child){this.children.push(child);},add(){},remove(){}});
  const layers=[];
  const group={clearLayers(){layers.length=0;},addLayer(m){layers.push(m);}};
  const storage=new Map();
  const context={console,URL,Option:function(){},Date,setTimeout:()=>1,clearTimeout(){},localStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},document:{getElementById:id=>elements[id]??=element(),createElement:element,head:{appendChild(){}}},L:{map:()=>({setView(){return this;},addLayer(){},removeLayer(){},fitBounds(){}}),tileLayer:()=>({addTo(){}}),markerClusterGroup:()=>group,marker:coords=>({coords,bindPopup(html){this.html=html;return this;}})}};
  context.window=context;vm.createContext(context);vm.runInContext(source,context);
  return {context,elements,layers,storage,run:code=>vm.runInContext(code,context)};
}
module.exports={app};
