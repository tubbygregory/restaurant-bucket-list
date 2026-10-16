const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {app}=require('./harness.cjs');
function features(stored){
 const a=app();a.context.location={href:'https://example.com/restaurant-bucket-list/',hash:''};a.context.URLSearchParams=URLSearchParams;a.context.navigator={};a.context.addEventListener=()=>{};a.context.showView=()=>{};a.context.history={replaceState(){}};
 if(stored)a.storage.set('restaurantBucketMap.personal.v1',stored);
 a.run(fs.readFileSync('features.js','utf8'));return a;
}
const item={name:'Branch',city:'London',area:'Soho',maps:'https://maps.google.com/?q=one',price:'££',priority:'A',coords:{lat:51.5,lon:0}};
test('branch identity survives row reordering and distinguishes branch links',()=>{
 const a=features();a.context.item=item;
 assert.equal(a.run('restaurantKey(item)'),JSON.stringify(['Branch','London','Soho',item.maps]));
 assert.notEqual(a.run('restaurantKey(item)'),a.run("restaurantKey({...item,maps:'https://maps.google.com/?q=two'})"));
});
test('personal records save safely, filter, and remain separate from shared links',()=>{
 const a=features();a.context.item=item;a.run('openDetails(item)');
 a.elements['detail-favourite'].checked=true;a.elements['detail-status'].value='visited';a.elements['detail-rating'].value='5';a.elements['detail-note'].value='<script>private note</script>';
 a.elements['personal-form'].handlers.submit({preventDefault(){}});
 const stored=JSON.parse(a.storage.get('restaurantBucketMap.personal.v1'));assert.equal(Object.values(stored)[0].rating,5);assert.equal(Object.values(stored)[0].note,'<script>private note</script>');
 a.elements['personal-status'].value='want';assert.equal(a.run('matchesPersonal(item)'),false);
 a.elements['personal-status'].value='visited';assert.equal(a.run('matchesPersonal(item)'),true);
 a.run('locationOrigin={lat:51.5,lon:0}');const state=JSON.parse(new URLSearchParams(new URL(a.run('buildShortlistLink()')).hash.split('?')[1]).get('filters'));
 assert.equal(state.origin,undefined);assert.equal(state.note,undefined);assert.equal(state.status,undefined);assert.doesNotMatch(a.run('restaurantLink(item)'),/private|visited/);
 assert.equal(a.run('shortlistState(true).origin.lat'),51.5);
});
test('corrupted storage is preserved and storage failure is reported',()=>{
 const a=features('{invalid');a.context.item=item;a.run('openDetails(item)');a.elements['personal-form'].handlers.submit({preventDefault(){}});assert.equal(a.storage.get('restaurantBucketMap.personal.v1'),'{invalid');assert.match(a.elements['personal-message'].textContent,/no changes were saved/);
 const b=features();b.context.item=item;b.run('openDetails(item)');b.context.localStorage.setItem=()=>{throw Error('quota')};b.elements['personal-form'].handlers.submit({preventDefault(){}});assert.match(b.elements['personal-message'].textContent,/session only/);
});
test('price, priority, nearest sorting and antimeridian bounds',()=>{
 const a=features();a.context.entries=[{item:{name:'Z',price:'£££',priority:'B'},distance:1},{item:{name:'A',price:'£',priority:'A'},distance:4},{item:{name:'B',price:'N/A',priority:''},distance:null}];
 for(const [mode,names]of [['price','A,Z,B'],['priority','A,Z,B'],['nearest','Z,A,B']]){a.elements['sort-results'].value=mode;a.run(mode==='nearest'?'locationOrigin={lat:51,lon:0}':'locationOrigin=null');assert.equal(a.run("sortMatches(entries).map(entry=>entry.item.name).join(',')"),names);}
 assert.equal(a.run('inMapBounds({lat:0,lon:179},{south:-10,north:10,west:170,east:-170})'),true);assert.equal(a.run('inMapBounds({lat:0,lon:0},{south:-10,north:10,west:170,east:-170})'),false);
});


test('copying links uses the clipboard and offers a manual fallback',async()=>{
 const a=features();let copied='';a.context.navigator.clipboard={writeText:async text=>copied=text};
 a.run("byId('share-link').value='https://example.com/restaurant-bucket-list/#results'; byId('share-message')");
 await a.run("copyLink(byId('share-link'),byId('share-message'))");assert.equal(copied,a.elements['share-link'].value);assert.equal(a.elements['share-message'].textContent,'Link copied.');
 let selected=false;a.elements['share-link'].focus=()=>{};a.elements['share-link'].select=()=>selected=true;a.context.navigator.clipboard.writeText=async()=>{throw Error('blocked')};
 await a.run("copyLink(byId('share-link'),byId('share-message'))");assert.equal(selected,true);assert.match(a.elements['share-message'].textContent,/copy this link/);
});
