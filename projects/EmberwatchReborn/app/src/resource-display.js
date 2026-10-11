// Read-only resource presentation. Never round a spendable pool up to a cost.
const validAmount=value=>Number.isFinite(value)&&value>=0;

export function formatResourceAmount(value,{health=false}={}){
 if(!validAmount(value))return '?';
 if(health)return String(Math.ceil(value));
 // Comparing the displayed number also catches values one float below a
 // boundary; adding an epsilon or blindly flooring value * 1000 would not.
 const rounded=Number(value.toFixed(3));
 return String(rounded>value?Number((rounded-.001).toFixed(3)):rounded);
}

// Quotes already belong to the runtime. Preserve all their decimal precision.
export function formatResourceCost(value){return validAmount(value)?String(value):'?';}
