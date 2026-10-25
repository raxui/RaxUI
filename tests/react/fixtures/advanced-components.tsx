"use client"
import * as React from "react"
import { SheenThemeProvider } from "@/lib/theme"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, CarouselCounter, CarouselDots } from "@/components/ui/carousel"
import { Chat, ChatMessages, ChatComposer, ChatMessageGroup, ChatBubble, ChatTyping } from "@/components/ui/chat"
import { AIResponse, AIReasoning, AIToolCall, AIPromptInput } from "@/components/ui/ai"
import { QRCode, QRCodeSvg, QRCodeDownload } from "@/components/ui/qr-code"
import { SpeedDial, SpeedDialTrigger, SpeedDialContent, SpeedDialItem, SpeedDialAction, SpeedDialLabel } from "@/components/ui/speed-dial"
import { TextEditor } from "@/components/ui/text-editor"
import { Kanban, KanbanBoard, KanbanColumn, KanbanColumnContent, KanbanColumnHeader, KanbanColumnTitle, KanbanItem, KanbanItemHandle, KanbanOverlay, type KanbanColumns } from "@/components/ui/kanban"

export default function Demo(){
 const [dir,setDir]=React.useState<"ltr"|"rtl">("ltr"),[mode,setMode]=React.useState<"light"|"dark">("light"),[messages,setMessages]=React.useState<string[]>([]),[html,setHtml]=React.useState("<p>Hello editor</p>"),[qr,setQr]=React.useState("https://example.com"),[answer,setAnswer]=React.useState("**Hello**"),[streaming,setStreaming]=React.useState(false),[share,setShare]=React.useState(false),[board,setBoard]=React.useState<KanbanColumns<string>>({todo:["Alpha","Beta"],done:[]})
 return <SheenThemeProvider direction={dir} mode={mode} appearance="glass" data-sheen-accent="emerald" style={{padding:24}}>
 <h1>Advanced components</h1><button onClick={()=>setDir(dir==="ltr"?"rtl":"ltr")}>Toggle direction</button><button onClick={()=>setMode(mode==="light"?"dark":"light")}>Toggle mode</button>
 <section aria-label="Carousel demo" style={{maxWidth:500}}><Carousel label="Featured slides"><CarouselContent>{[1,2,3].map(i=><CarouselItem key={i}><div style={{height:120}}>Slide {i}</div></CarouselItem>)}</CarouselContent><CarouselPrevious/><CarouselNext/><CarouselCounter/><CarouselDots/></Carousel></section>
 <Chat style={{height:240,maxWidth:500}}><ChatMessages>{messages.map((m,i)=><ChatMessageGroup key={i} from="self"><ChatBubble>{m}</ChatBubble></ChatMessageGroup>)}<ChatTyping name="Noura"/></ChatMessages><ChatComposer placeholder="Compose message" onSend={m=>setMessages(v=>[...v,m])}/></Chat>
 <section aria-label="AI demo"><AIResponse markdown streaming={streaming}>{answer}</AIResponse><AIReasoning doneLabel="Show reasoning">Reasoning detail</AIReasoning><AIToolCall name="search" status="completed" input={{q:"theme"}}/><AIPromptInput placeholder="Ask assistant" status={streaming?"streaming":"ready"} onSubmit={m=>{setAnswer(m+" **stream");setStreaming(true)}} onStop={()=>setStreaming(false)}/></section>
 <TextEditor aria-label="Document" value={html} onChange={setHtml} name="document" maxLength={200} showCount/><output aria-label="Saved HTML">{html}</output>
 <label>QR content<input value={qr} onChange={e=>setQr(e.target.value)}/></label><QRCode value={qr}><QRCodeSvg label="Scan code"/><QRCodeDownload format="svg">Download SVG</QRCodeDownload></QRCode>
 <div style={{height:200,paddingTop:140}}><SpeedDial><SpeedDialTrigger aria-label="More actions"/><SpeedDialContent><SpeedDialItem><SpeedDialAction onClick={()=>setShare(true)}/><SpeedDialLabel>Share</SpeedDialLabel></SpeedDialItem></SpeedDialContent></SpeedDial>{share&&<p>Shared</p>}</div>
 <Kanban value={board} onValueChange={setBoard}><KanbanBoard style={{maxWidth:700}}>{Object.entries(board).map(([col,cards])=><KanbanColumn key={col} value={col} aria-label={col}><KanbanColumnHeader><KanbanColumnTitle>{col}</KanbanColumnTitle></KanbanColumnHeader><KanbanColumnContent empty="Drop here">{cards.map(card=><KanbanItem key={card} value={card} asHandle={false}><KanbanItemHandle aria-label={"Move "+card}/>{card}</KanbanItem>)}</KanbanColumnContent></KanbanColumn>)}</KanbanBoard><KanbanOverlay>{({value})=><KanbanItem value={value}>{value}</KanbanItem>}</KanbanOverlay></Kanban><output aria-label="Board state">{JSON.stringify(board)}</output>
 </SheenThemeProvider>
}
