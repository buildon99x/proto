// Presentation only: count the existing visible buttons, without reordering or
// rebinding them. Balance partial rows so a sixth action is never an orphan at
// widths which comfortably fit six readable targets.
export function hotbarLayout({width=1024,count=6}={}){
 const available=Math.max(88,(Number.isFinite(width)?width:1024)-24);
 const actions=Math.max(1,Math.floor(Number.isFinite(count)?count:6));
 const capacity=Math.max(1,Math.floor((available+6)/94));
 const rows=Math.ceil(actions/capacity),columns=Math.ceil(actions/rows);
 return {columns,rows,width:Math.min(available,columns*112+(columns-1)*6),stack:12+rows*72+(rows-1)*6};
}
export function applyHotbarLayout(hud,options){
 const layout=hotbarLayout(options),style=hud?.style;
 // Optional only for non-browser boundary probes. A real HUD has a style object.
 if(style?.setProperty)for(const [name,value] of Object.entries({'--hotbar-columns':String(layout.columns),'--hotbar-width':layout.width+'px','--hotbar-stack':layout.stack+'px'})){
  if(style.getPropertyValue(name)!==value)style.setProperty(name,value);
 }
 return layout;
}
