"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, type ChangeEvent, type FormEvent, type ReactNode } from "react";

import { getPublicEnv } from "@/lib/env/public";
import { createBrowserSupabaseClient } from "@/lib/supabase/client";

type Row=Record<string,unknown>;
function stringOf(row:Row,key:string){return typeof row[key]==="string"?row[key]:""}
type ActionRequest=(endpoint:string,method?:string,payload?:unknown)=>Promise<Response|null>;
type ActionDownload=(endpoint:string,fileName:string)=>Promise<void>;

export function actionHeaders(accessToken:string,hostname:string,hasBody:boolean):Record<string,string>{
  const headers:Record<string,string>={authorization:`Bearer ${accessToken}`,"x-tenant-hostname":hostname};
  if(hasBody) headers["content-type"]="application/json";
  return headers;
}

export async function emitAndDownloadAssetTerm(movementId:string,movementType:string,request:ActionRequest,download:ActionDownload){
  const termType=["delivery","loan","return"].includes(movementType)?movementType:"transfer";
  const response=await request(`asset-movements/${movementId}/terms`,"POST",{term_type:termType});
  if(!response)return;
  const body:unknown=await response.json();
  const termId=typeof body==="object"&&body!==null&&"data" in body&&typeof body.data==="string"?body.data:"";
  if(!termId)throw new Error("A API não retornou o termo emitido.");
  await download(`asset-terms/${termId}/pdf`,`termo-${termId}.pdf`);
}

interface SignedStorageUploadOptions {
  supabaseUrl: string;
  supabaseAnonKey: string;
  accessToken: string;
  bucket: string;
  path: string;
  uploadToken: string;
  file: File;
  onProgress: (percent: number) => void;
}

export async function uploadSignedFileWithProgress(
  options: SignedStorageUploadOptions,
  createRequest: () => XMLHttpRequest = () => new XMLHttpRequest()
): Promise<void> {
  const storageUrl = options.supabaseUrl.replace(/\/+$/, "");
  const objectPath = [options.bucket, ...options.path.split("/")]
    .map((segment) => encodeURIComponent(segment))
    .join("/");
  const url = new URL(`${storageUrl}/storage/v1/object/upload/sign/${objectPath}`);
  url.searchParams.set("token", options.uploadToken);

  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", options.file);

  return new Promise((resolve, reject) => {
    const request = createRequest();
    request.upload.onprogress = (event) => {
      if (!event.lengthComputable || event.total <= 0) return;
      const progress = Math.floor((event.loaded / event.total) * 100);
      options.onProgress(Math.min(99, Math.max(0, progress)));
    };

    request.onload = () => {
      if (request.status >= 200 && request.status < 300) {
        resolve();
      } else {
        reject(new Error("Falha ao enviar o arquivo para o armazenamento."));
      }
    };
    request.onerror = () => reject(new Error("Falha de rede durante o envio do arquivo."));
    request.onabort = () => reject(new Error("O envio do arquivo foi cancelado."));

    try {
      request.open("PUT", url.toString(), true);
      request.setRequestHeader("apikey", options.supabaseAnonKey);
      request.setRequestHeader("Authorization", `Bearer ${options.accessToken}`);
      request.setRequestHeader("x-upsert", "false");
      request.send(body);
    } catch (error) {
      reject(error instanceof Error ? error : new Error("Falha ao iniciar o envio do arquivo."));
    }
  });
}

interface UploadStatusProps {
  file: File;
  previewUrl: string | null;
  progress: number | null;
  completed: boolean;
}

export function UploadStatus({ file, previewUrl, progress, completed }: UploadStatusProps) {
  return (
    <section className="asset-upload-status" aria-busy={progress !== null && !completed}>
      {previewUrl && file.type.startsWith("image/") ? (
        <img className="asset-upload-status__preview" src={previewUrl} alt={`Prévia de ${file.name}`} />
      ) : null}
      <p role="status" aria-live="polite" aria-atomic="true">
        {completed
          ? `Arquivo ${file.name} anexado.`
          : progress === null
            ? `Não foi possível concluir o envio de ${file.name}.`
            : `Enviando ${file.name}: ${progress}%.`}
      </p>
      {!completed && progress !== null ? (
        <progress value={progress} max={100} aria-label={`Progresso do envio de ${file.name}`} />
      ) : null}
    </section>
  );
}

export function RecordActions({path,record}:{path:string;record:Row}){
  const router=useRouter();const[busy,setBusy]=useState(false);const[error,setError]=useState("");const[uploadFile,setUploadFile]=useState<File|null>(null);const[uploadProgress,setUploadProgress]=useState<number|null>(null);const[uploadCompleted,setUploadCompleted]=useState(false);const[preview,setPreview]=useState<{file:File;url:string}|null>(null);const[panel,setPanel]=useState<"scan"|"fulfill"|null>(null);const[products,setProducts]=useState<Row[]>([]);const[locations,setLocations]=useState<Row[]>([]);const id=stringOf(record,"id");
  useEffect(()=>{if(!uploadFile?.type.startsWith("image/")){setPreview(null);return;}const imageUrl=URL.createObjectURL(uploadFile);setPreview({file:uploadFile,url:imageUrl});return()=>URL.revokeObjectURL(imageUrl)},[uploadFile]);
  async function request(endpoint:string,method="POST",payload?:unknown){setBusy(true);setError("");try{const{data:{session}}=await createBrowserSupabaseClient().auth.getSession();if(!session)throw new Error("Sessão expirada.");const base=(process.env.NEXT_PUBLIC_API_URL??"http://localhost:3333").replace(/\/$/,"");const response=await fetch(`${base}/v1/${endpoint}`,{method,headers:actionHeaders(session.access_token,window.location.hostname,payload!==undefined),body:payload===undefined?undefined:JSON.stringify(payload)});if(!response.ok){const body:unknown=await response.json();const message=typeof body==="object"&&body!==null&&"error"in body&&typeof body.error==="object"&&body.error!==null&&"message"in body.error&&typeof body.error.message==="string"?body.error.message:"Operação não concluída.";throw new Error(message);}router.refresh();return response;}catch(reason){setError(reason instanceof Error?reason.message:"Operação não concluída.");return null;}finally{setBusy(false)}}
  async function download(endpoint:string,fileName:string,method="GET",payload?:unknown){const response=await request(endpoint,method,payload);if(!response)return;const blob=await response.blob();const url=URL.createObjectURL(blob);const link=document.createElement("a");link.href=url;link.download=fileName;link.click();URL.revokeObjectURL(url)}
  async function upload(event:ChangeEvent<HTMLInputElement>){const input=event.currentTarget;const file=input.files?.[0];if(!file||!id)return;setUploadFile(file);setUploadProgress(0);setUploadCompleted(false);setBusy(true);setError("");try{const supabase=createBrowserSupabaseClient();const{data:{session}}=await supabase.auth.getSession();if(!session)throw new Error("Sessão expirada.");const base=(process.env.NEXT_PUBLIC_API_URL??"http://localhost:3333").replace(/\/$/,"");const headers={authorization:`Bearer ${session.access_token}`,"content-type":"application/json","x-tenant-hostname":window.location.hostname};const signResponse=await fetch(`${base}/v1/files/sign-upload`,{method:"POST",headers,body:JSON.stringify({entity_type:"asset",entity_id:id,file_name:file.name})});if(!signResponse.ok)throw new Error("Não foi possível autorizar o arquivo.");const signed:unknown=await signResponse.json();if(typeof signed!=="object"||signed===null||!("data"in signed)||typeof signed.data!=="object"||signed.data===null||!("path"in signed.data)||!("token"in signed.data)||typeof signed.data.path!=="string"||typeof signed.data.token!=="string")throw new Error("Resposta de upload inválida.");const publicEnv=getPublicEnv();await uploadSignedFileWithProgress({supabaseUrl:publicEnv.supabaseUrl,supabaseAnonKey:publicEnv.supabaseAnonKey,accessToken:session.access_token,bucket:"tenant-documents",path:signed.data.path,uploadToken:signed.data.token,file,onProgress:setUploadProgress});const register=await fetch(`${base}/v1/assets/files`,{method:"POST",headers,body:JSON.stringify({asset_id:id,kind:file.type.startsWith("image/")?"image":"other",name:file.name,storage_path:signed.data.path,mime_type:file.type||undefined,size_bytes:file.size})});if(!register.ok)throw new Error("Arquivo enviado, mas não vinculado ao ativo.");setUploadProgress(100);setUploadCompleted(true);router.refresh();}catch(reason){setError(reason instanceof Error?reason.message:"Falha no upload.");setUploadProgress(null);setUploadCompleted(false);}finally{setBusy(false);input.value=""}}
  async function loadOptions(){
    if(products.length||locations.length)return;
    const{data:{session}}=await createBrowserSupabaseClient().auth.getSession();
    if(!session)return;
    const base=(process.env.NEXT_PUBLIC_API_URL??"http://localhost:3333").replace(/\/$/,"");
    const headers={authorization:`Bearer ${session.access_token}`,"x-tenant-hostname":window.location.hostname};
    const [productResponse,locationResponse]=await Promise.all([fetch(`${base}/v1/stock/products?tamanho=100`,{headers}),fetch(`${base}/v1/stock/locations?tamanho=100`,{headers})]);
    const productBody:unknown=productResponse.ok?await productResponse.json():null;
    const locationBody:unknown=locationResponse.ok?await locationResponse.json():null;
    if(productBody&&typeof productBody==="object"&&"data"in productBody&&Array.isArray(productBody.data))setProducts(productBody.data as Row[]);
    if(locationBody&&typeof locationBody==="object"&&"data"in locationBody&&Array.isArray(locationBody.data))setLocations(locationBody.data as Row[]);
  }
  async function submitScan(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);const isStock=path==="almoxarifado/inventarios";const response=await request(`inventories/${id}/scans/${isStock?"stock":"assets"}`,"POST",isStock?{target_product_id:data.get("product_id"),counted_quantity:Number(data.get("counted_quantity"))}:{asset_qr_token:data.get("asset_qr_token"),target_location_id:data.get("target_location_id")||undefined,condition_value:data.get("condition_value")||undefined});if(response){setPanel(null);event.currentTarget.reset();}}
  async function submitFulfillment(event:FormEvent<HTMLFormElement>){event.preventDefault();const data=new FormData(event.currentTarget);const response=await request(`stock/requisitions/${id}/fulfill`,"POST",{target_stock_location_id:data.get("stock_location_id"),deliveries_value:[{product_id:data.get("product_id"),quantity:Number(data.get("quantity"))}]});if(response){setPanel(null);event.currentTarget.reset();}}
  const status=stringOf(record,"status");const actions:ReactNode[]=[];
  if(path==="patrimonio/ativos"){actions.push(<Link key="edit" className="record-action-link" href={`/${path}/${id}/editar`}>Editar</Link>,<button key="qr" type="button" onClick={()=>void download(`assets/${id}/qr?format=png`,`qr-${stringOf(record,"internal_code")||id}.png`)} disabled={busy}>QR</button>,<button key="labels" type="button" onClick={()=>void download("assets/qr-labels","etiqueta.pdf","POST",{asset_ids:[id]})} disabled={busy}>Etiqueta</button>,<label key="file" className="action-upload">Anexar<input type="file" onChange={event=>void upload(event)} disabled={busy} aria-label="Arquivo para anexar ao ativo"/></label>)}
  if(path==="patrimonio/movimentacoes"){const movement=stringOf(record,"type");actions.push(<button key="term" type="button" onClick={()=>void emitAndDownloadAssetTerm(id,movement,request,download).catch(reason=>setError(reason instanceof Error?reason.message:"Não foi possível emitir o termo."))} disabled={busy}>Emitir termo</button>)}
  if(path==="meus-termos"){if(!record.accepted_at)actions.push(<button key="accept" type="button" onClick={()=>void request(`asset-terms/${id}/accept`)} disabled={busy}>Aceitar</button>);actions.push(<button key="pdf" type="button" onClick={()=>void download(`asset-terms/${id}/pdf`,`termo-${id}.pdf`)} disabled={busy}>PDF</button>)}
  if(path.includes("inventarios")){if(status==="draft"||status==="planned")actions.push(<button key="start" type="button" onClick={()=>void request(`inventories/${id}/start`)} disabled={busy}>Iniciar</button>);if(status==="active"||status==="reconciling"){actions.push(<button key="scan" type="button" onClick={()=>{setPanel(panel==="scan"?null:"scan");void loadOptions()}} disabled={busy}>Ler QR</button>);actions.push(<button key="complete" type="button" onClick={()=>void request(`inventories/${id}/complete`)} disabled={busy}>Encerrar</button>)}}
  if(path==="almoxarifado/requisicoes"){const next:Record<string,string>={requested:"approved",awaiting_approval:"approved",approved:"separating",separating:"ready"};if(next[status])actions.push(<button key="advance" type="button" onClick={()=>void request(`stock/requisitions/${id}/status`,"POST",{target_status:next[status]})} disabled={busy}>Avançar</button>);if(["approved","separating","ready","partially_fulfilled"].includes(status))actions.push(<button key="fulfill" type="button" onClick={()=>{setPanel(panel==="fulfill"?null:"fulfill");void loadOptions()}} disabled={busy}>Entregar</button>)}
  if(path==="notificacoes"&&!record.read_at)actions.push(<button key="read" type="button" onClick={()=>void request(`notifications/${id}/read`)} disabled={busy}>Marcar como lida</button>);
  if(actions.length===0)return null;return <div className="record-actions">{actions}{uploadFile?<UploadStatus file={uploadFile} previewUrl={preview?.file===uploadFile?preview.url:null} progress={uploadProgress} completed={uploadCompleted}/>:null}{error?<p className="record-action-error" role="alert">{error}</p>:null}{panel==="scan"?<form className="inline-action-form" onSubmit={submitScan}>{path==="almoxarifado/inventarios"?<><select name="product_id" required defaultValue=""><option value="">Produto contado</option>{products.map(row=><option key={stringOf(row,"id")} value={stringOf(row,"id")}>{stringOf(row,"name")||stringOf(row,"code")}</option>)}</select><input name="counted_quantity" type="number" min="0" step="any" required placeholder="Quantidade física"/></>:<><input name="asset_qr_token" required placeholder="Token UUID do QR do ativo"/><select name="target_location_id" defaultValue=""><option value="">Manter localização atual</option>{locations.map(row=><option key={stringOf(row,"id")} value={stringOf(row,"id")}>{stringOf(row,"name")||stringOf(row,"code")}</option>)}</select><select name="condition_value" defaultValue="good"><option value="new">Novo</option><option value="good">Bom</option><option value="fair">Regular</option><option value="poor">Ruim</option><option value="damaged">Danificado</option></select></>}<button type="submit" disabled={busy}>Confirmar leitura</button></form>:null}{panel==="fulfill"?<form className="inline-action-form" onSubmit={submitFulfillment}><select name="product_id" required defaultValue=""><option value="">Produto entregue</option>{products.map(row=><option key={stringOf(row,"id")} value={stringOf(row,"id")}>{stringOf(row,"name")||stringOf(row,"code")}</option>)}</select><select name="stock_location_id" required defaultValue=""><option value="">Estoque de origem</option>{locations.map(row=><option key={stringOf(row,"id")} value={stringOf(row,"id")}>{stringOf(row,"name")||stringOf(row,"code")}</option>)}</select><input name="quantity" type="number" min="0.0001" step="any" required placeholder="Quantidade"/><button type="submit" disabled={busy}>Confirmar entrega</button></form>:null}</div>;
}
