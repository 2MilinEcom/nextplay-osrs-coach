export type ClipPart={blob:Blob,duration:number};
// Every segment is a complete media container. Arbitrarily sliced WebM chunks are not playable.
export class RollingCapture {
  stream:MediaStream; recorder:MediaRecorder|null=null; running=false; parts:ClipPart[]=[];
  started=0; timer:ReturnType<typeof setTimeout>|null=null; closing:Promise<void>|null=null;
  onEnded:()=>void; queue:Promise<unknown>=Promise.resolve();
  private exclusive<T>(fn:()=>Promise<T>):Promise<T>{const task=this.queue.then(fn);this.queue=task.catch(()=>{});return task;}
  constructor(stream:MediaStream,onEnded:()=>void){this.stream=stream;this.onEnded=onEnded;}
  start(){this.running=true;this.segment();this.stream.getVideoTracks()[0].addEventListener('ended',()=>{if(this.running)this.onEnded();},{once:true});}
  private segment(){
    const mime=['video/webm;codecs=vp9','video/webm;codecs=vp8','video/mp4'].find(m=>MediaRecorder.isTypeSupported(m));
    this.recorder=new MediaRecorder(this.stream,{...(mime?{mimeType:mime}:{}),videoBitsPerSecond:1500000});
    const chunks:Blob[]=[];this.started=performance.now();
    this.recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};
    this.recorder.onerror=()=>this.onEnded();
    let done:()=>void;this.closing=new Promise<void>(r=>{done=r;});
    this.recorder.onstop=()=>{const duration=(performance.now()-this.started)/1000;const blob=new Blob(chunks,{type:this.recorder?.mimeType||'video/webm'});if(blob.size&&duration>.1)this.parts.push({blob,duration});while(this.parts.length>1&&(this.parts.slice(1).reduce((s,p)=>s+p.duration,0)>=60||this.parts.reduce((s,p)=>s+p.blob.size,0)>32*1024*1024))this.parts.shift();done();};
    this.recorder.start(1000);this.timer=setTimeout(()=>void this.rotate(),15000);
  }
  private async rotate(){return this.exclusive(async()=>{if(!this.running)return;await this.finishSegment();if(this.running)this.segment();});}
  private async finishSegment(){if(this.timer)clearTimeout(this.timer);if(this.recorder?.state==='recording')this.recorder.stop();await this.closing;}
  async mark(){return this.exclusive(async()=>{await this.finishSegment();const copy=this.parts.slice();if(this.running)this.segment();return copy;});}
  async stop(){this.running=false;return this.exclusive(async()=>{await this.finishSegment();this.stream.getTracks().forEach(t=>t.stop());return this.parts.slice();});}
  dispose(){this.running=false;if(this.timer)clearTimeout(this.timer);if(this.recorder?.state==='recording')this.recorder.stop();this.stream.getTracks().forEach(t=>t.stop());}
}
export async function videoDuration(file:Blob):Promise<number>{return new Promise((resolve,reject)=>{const v=document.createElement('video'),url=URL.createObjectURL(file);const clean=()=>{clearTimeout(timer);v.removeAttribute('src');v.load();URL.revokeObjectURL(url);};const timer=setTimeout(()=>{clean();reject(new Error('Could not read this video. Try an MP4 export.'));},15000);v.preload='metadata';v.onloadedmetadata=()=>{if(Number.isFinite(v.duration)&&v.duration>0){const d=v.duration;clean();resolve(d);}else{v.currentTime=1e10;v.ontimeupdate=()=>{const d=v.duration;if(Number.isFinite(d)&&d>0){clean();resolve(d);}};}};v.onerror=()=>{clean();reject(new Error('This video format is not supported by your browser.'));};v.src=url;});}
export async function sampleFrames(session:any){const total=session.parts.reduce((s:number,p:any)=>s+p.duration,0),count=Math.min(24,Math.max(2,Math.ceil(total/2)));const frames:{t:number,image:string}[]=[];let offset=0;for(let part=0;part<session.parts.length;part++){const p=session.parts[part];if(!p.ready)throw new Error('Wait for the clip upload to finish.');const v=document.createElement('video');v.muted=true;v.preload='auto';v.src=`/api/sessions/${session.id}/video/${part}`;await waitVideo(v,'loadeddata');const canvas=document.createElement('canvas'),scale=Math.min(1,1280/v.videoWidth);canvas.width=v.videoWidth*scale;canvas.height=v.videoHeight*scale;const ctx=canvas.getContext('2d')!;for(let i=0;i<count;i++){const t=i*(total-.1)/(count-1);if(t<offset||t>=offset+p.duration)continue;const local=Math.max(.01,t-offset);if(Math.abs(v.currentTime-local)>.005){const pending=waitVideo(v,'seeked');v.currentTime=local;await pending;}ctx.drawImage(v,0,0,canvas.width,canvas.height);frames.push({t:+t.toFixed(2),image:canvas.toDataURL('image/jpeg',.7)});}offset+=p.duration;v.removeAttribute('src');v.load();}return frames;}
function waitVideo(v:HTMLVideoElement,event:string){return new Promise<void>((resolve,reject)=>{const timer=setTimeout(()=>finish(new Error('The video could not be decoded. Try importing an MP4 copy.')),12000);const done=()=>finish(),error=()=>finish(new Error('Video playback failed.'));function finish(e?:Error){clearTimeout(timer);v.removeEventListener(event,done);v.removeEventListener('error',error);e?reject(e):resolve();}v.addEventListener(event,done,{once:true});v.addEventListener('error',error,{once:true});});}
