// A private, random capability for this installation's push subscription.
// No account, email, fingerprint or ChatGPT login is needed.
let deviceToken:string|undefined;
export function deviceHeaders(){
 if(!deviceToken){
  try{deviceToken=localStorage.getItem('noor-push-device')||undefined;}catch{}
  if(!deviceToken||!/^[a-f0-9]{64}$/.test(deviceToken)){
   deviceToken=Array.from(crypto.getRandomValues(new Uint8Array(32))).map(b=>b.toString(16).padStart(2,'0')).join('');
   try{localStorage.setItem('noor-push-device',deviceToken);}catch{}
  }
 }
 return {'Content-Type':'application/json','X-Noor-Device-Token':deviceToken};
}
