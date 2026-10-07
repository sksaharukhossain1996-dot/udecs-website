export type VoiceStatus={available:boolean;recognition:boolean;tts:boolean;message:string};
export type VoiceEvent={type:'ready'|'listening'|'result'|'error'|'stopped'|'speaking'|'spoken';session:string;text?:string;message?:string};
const LOCAL_ORIGIN='https://appassets.androidplatform.net';
let port:MessagePort|null=null;
let state:VoiceStatus={available:false,recognition:false,tts:false,message:'Device-local voice needs the Android build. Type a command here; no microphone audio is sent to a cloud service.'};
if(typeof window!=='undefined')window.addEventListener('message',event=>{
  if(location.origin!==LOCAL_ORIGIN||window.top!==window||event.source!==null||event.data!=='UDECS_LOCAL_VOICE_V1'||event.ports.length!==1)return;
  port?.close();port=event.ports[0];
  port.onmessage=event=>{let row:any;try{row=JSON.parse(event.data);}catch{return;}
    if(row.type==='capabilities'){state={available:row.recognition===true||row.tts===true,recognition:row.recognition===true,tts:row.tts===true,message:typeof row.message==='string'?row.message:'Offline language support must be checked.'};window.dispatchEvent(new Event('udecs-device-capabilities'));return;}
    if(typeof row.session==='string'&&row.session.length<=80&&['ready','listening','result','error','stopped','speaking','spoken'].includes(row.type))window.dispatchEvent(new CustomEvent('udecs-device-voice',{detail:row}));
  };port.start();port.postMessage(JSON.stringify({kind:'capabilities'}));
});
export function capabilities():VoiceStatus {return state;}
function send(value:any){if(!port)throw Error('Device voice channel unavailable. Type instead.');port.postMessage(JSON.stringify(value));}
export class DeviceVoice {
  private session='';private timer:ReturnType<typeof setTimeout>|null=null;
  constructor(private receive:(event:VoiceEvent)=>void){window.addEventListener('udecs-device-voice',this.listener);document.addEventListener('visibilitychange',this.hidden);}
  private listener=(event:Event)=>{const row=(event as CustomEvent).detail;if(!row||row.session!==this.session)return;if(row.type!=='listening'&&row.type!=='speaking')this.clearTimer();this.receive(row);};
  private hidden=()=>{if(document.hidden)this.stop();};
  private clearTimer(){if(this.timer)clearTimeout(this.timer);this.timer=null;}
  start(language:string){this.stop();if(!capabilities().recognition)throw Error('On-device recognition unavailable. Type instead.');this.session=crypto.randomUUID();send({kind:'start',session:this.session,language});this.timer=setTimeout(()=>{this.stop();this.receive({type:'error',session:'',message:'Voice timed out. Microphone stopped.'});},30000);}
  stop(){this.clearTimer();if(this.session&&port)send({kind:'stop',session:this.session});this.session='';this.receive({type:'stopped',session:''});}
  speak(text:string,language:string){this.stop();if(!capabilities().tts)throw Error('Offline speech voice unavailable. Read reply on screen.');this.session=crypto.randomUUID();send({kind:'speak',session:this.session,text:text.slice(0,12000),language});}
  dispose(){this.stop();window.removeEventListener('udecs-device-voice',this.listener);document.removeEventListener('visibilitychange',this.hidden);}
}
