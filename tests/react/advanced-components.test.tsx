
import { beforeAll, describe, expect, it, vi } from "vitest"
import { render, screen, fireEvent, waitFor, renderHook, act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Kanban } from "../../registry/react/components/kanban/kanban"
import { renderToString } from "react-dom/server"
import { Chat, ChatBubble, ChatComposer, ChatMessageGroup } from "../../registry/react/components/chat/chat"
import { AIResponse, AIPromptInput, AIReasoning, AIToolCall } from "../../registry/react/components/ai/ai"
import { closeOpenMarks } from "../../registry/react/components/ai/ai-response"
import { useCopy } from "../../registry/react/components/ai/ai-shared"
import { QRCode, QRCodeSvg } from "../../registry/react/components/qr-code/qr-code"
import { qrPath, svgMarkup } from "../../registry/react/components/qr-code/qr-code-drawing"
import { SpeedDial, SpeedDialTrigger, SpeedDialContent, SpeedDialItem, SpeedDialAction, SpeedDialLabel } from "../../registry/react/components/speed-dial/speed-dial"
import { TextEditor, htmlToText } from "../../registry/react/components/text-editor/text-editor"
import type { Editor } from "@tiptap/core"

beforeAll(() => {
 window.matchMedia ??= ((media:string)=>({matches:false,media,addEventListener(){},removeEventListener(){},addListener(){},removeListener(){}})) as typeof window.matchMedia
 vi.stubGlobal("ResizeObserver", class {observe(){} unobserve(){} disconnect(){}})
})
describe("advanced React components",()=>{
 it("rejects duplicate card IDs and collisions with columns before dragging",()=>{
 expect(()=>renderToString(<Kanban value={{todo:["x"],done:["x"]}}/>)).toThrow("IDs must be unique");
 expect(()=>renderToString(<Kanban value={{todo:["todo"]}}/>)).toThrow("IDs must be unique")
 })
 it("sends trimmed chat text, clears it, and preserves Shift+Enter and IME composition",async()=>{
  const send=vi.fn(),user=userEvent.setup();render(<ChatComposer onSend={send} placeholder="Compose"/>);const input=screen.getByPlaceholderText("Compose")
  await user.type(input,"  hello  ");await user.keyboard("{Enter}");expect(send).toHaveBeenCalledWith("hello");expect(input).toHaveValue("")
  await user.type(input,"next");await user.keyboard("{Shift>}{Enter}{/Shift}");expect(send).toHaveBeenCalledTimes(1)
  fireEvent.keyDown(input,{key:"Enter",isComposing:true});expect(send).toHaveBeenCalledTimes(1)
 })
 it("keeps controlled composer value with the owner and disables empty sends",async()=>{
  const change=vi.fn();render(<ChatComposer onSend={vi.fn()} value="" onValueChange={change}/>);expect(screen.getByRole("button",{name:"Send"})).toBeDisabled()
  fireEvent.change(screen.getByRole("textbox"),{target:{value:"x"}});expect(change).toHaveBeenCalledWith("x");expect(screen.getByRole("textbox")).toHaveValue("")
 })
 it("translates chat status and retry labels",async()=>{
  const retry=vi.fn();render(<Chat labels={{failed:"فشل",retry:"أعد المحاولة"}}><ChatMessageGroup from="self"><ChatBubble status="failed" onRetry={retry}>Message</ChatBubble></ChatMessageGroup></Chat>)
  await userEvent.click(screen.getByRole("button",{name:"أعد المحاولة"}));expect(retry).toHaveBeenCalledOnce()
 })
 it("renders safe GFM with streaming marks, tables and copyable code",()=>{
  const {container}=render(<AIResponse markdown streaming>{"**hello\n\n| a | b |\n| - | - |\n| 1 | 2 |\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))\n\n\x60\x60\x60js\nconst x = 1"}</AIResponse>)
  expect(container.querySelector("script")).toBeNull();expect(container.querySelector('a[href^="javascript:"]')).toBeNull();expect(screen.getByRole("table")).toBeInTheDocument();expect(screen.getByRole("button",{name:"Copy"})).toBeInTheDocument()
  expect(closeOpenMarks("**bold")).toBe("**bold**");expect(closeOpenMarks("\x60\x60\x60js\n**")).toBe("\x60\x60\x60js\n**")
 })
 it("reports clipboard success only after the write succeeds",async()=>{
  const writeText=vi.fn().mockRejectedValueOnce(new Error("blocked")).mockResolvedValueOnce(undefined);Object.defineProperty(navigator,"clipboard",{configurable:true,value:{writeText}})
  const {result}=renderHook(useCopy);await act(async()=>{await result.current.copy("one")});expect(result.current.copied).toBe(false);await act(async()=>{await result.current.copy("two")});expect(result.current.copied).toBe(true)
 })
 it("submits AI prompts and exposes stop while streaming",async()=>{
  const send=vi.fn(),stop=vi.fn(),user=userEvent.setup();const view=render(<AIPromptInput onSubmit={send}/>);await user.type(screen.getByRole("textbox"),"question");await user.keyboard("{Enter}");expect(send).toHaveBeenCalledWith("question")
  view.rerender(<AIPromptInput onSubmit={send} status="streaming" onStop={stop} labels={{stop:"أوقف"}}/>);await user.click(screen.getByRole("button",{name:"أوقف"}));expect(stop).toHaveBeenCalledOnce()
 })
 it("exposes reasoning and tool-call disclosure states",async()=>{
  render(<><AIReasoning doneLabel="Reasoning">Details</AIReasoning><AIToolCall name="search" status="completed" input={{q:"x"}}/></>);await userEvent.click(screen.getByText("Reasoning"));expect(screen.getByText("Details")).toBeVisible();expect(screen.getByText("search")).toBeVisible()
 })
 it("opens speed dial with arrows, navigates actions and restores focus on Escape",async()=>{
  const user=userEvent.setup();render(<SpeedDial><SpeedDialTrigger aria-label="Actions"/><SpeedDialContent><SpeedDialItem><SpeedDialAction/><SpeedDialLabel>Share</SpeedDialLabel></SpeedDialItem><SpeedDialItem><SpeedDialAction/><SpeedDialLabel>Save</SpeedDialLabel></SpeedDialItem></SpeedDialContent></SpeedDial>)
  const trigger=screen.getByRole("button",{name:"Actions"});trigger.focus();await user.keyboard("{ArrowUp}");await waitFor(()=>expect(screen.getByRole("menuitem",{name:"Share"})).toHaveFocus());await user.keyboard("{ArrowUp}");expect(screen.getByRole("menuitem",{name:"Save"})).toHaveFocus();await user.keyboard("{Escape}");expect(trigger).toHaveFocus();expect(trigger).toHaveAttribute("aria-expanded","false")
 })
 it("generates a QR matrix and updates it when its value changes",async()=>{
  const generated=vi.fn();const view=render(<QRCode value="first" onGenerated={generated}><QRCodeSvg label="Scan"/></QRCode>);await waitFor(()=>expect(screen.getByRole("img",{name:"Scan"}).querySelector("path")).toBeTruthy());const d=screen.getByRole("img",{name:"Scan"}).querySelector("path")!.getAttribute("d");view.rerender(<QRCode value="second"><QRCodeSvg label="Scan"/></QRCode>);expect(screen.queryByRole("img",{name:"Scan"})).toBeNull();await waitFor(()=>expect(screen.getByRole("img",{name:"Scan"}).querySelector("path")!.getAttribute("d")).not.toBe(d));expect(generated).toHaveBeenCalledOnce()
 })
 it("handles QR encoder errors",async()=>{
  const onError=vi.fn();render(<QRCode value={"x".repeat(10000)} onError={onError}><QRCodeSvg/></QRCode>);await waitFor(()=>expect(onError).toHaveBeenCalledOnce())
 })
 it("draws merged square runs and escapes downloadable SVG attributes",()=>{
  const matrix={count:2,get:()=>true};expect(qrPath(matrix,0,"square",0)).toBe("M0 0h2v1h-2zM0 1h2v1h-2z")
  const svg=svgMarkup({matrix,margin:1,shape:"square",hole:0,foregroundColor:'red" onload="bad',backgroundColor:"white",size:200} as unknown as Parameters<typeof svgMarkup>[0]);expect(svg).toContain("&quot;");expect(new DOMParser().parseFromString(svg,"image/svg+xml").querySelector("[onload]")).toBeNull()
 })
 it("renders the editor on the server without constructing a browser editor",()=>{const random=vi.spyOn(Math,"random").mockImplementation(()=>{throw new Error("SSR random")});try {expect(renderToString(<TextEditor defaultValue="<p>Hello</p>" aria-label="Document"/>)).toContain("rax-editor")}finally{random.mockRestore()}})
 it("keeps controlled HTML, readonly state, hidden form value and character limit",async()=>{
  const editorRef={current:null as Editor|null},change=vi.fn();const view=render(<TextEditor editorRef={editorRef} value="<p>Hello</p>" onChange={change} maxLength={8} name="body" aria-label="Document"/>);await waitFor(()=>expect(editorRef.current).toBeTruthy());expect(screen.getByRole("textbox",{name:"Document"})).toHaveTextContent("Hello")
  act(()=>{editorRef.current!.commands.insertContent("0123456789")});expect(htmlToText(editorRef.current!.getHTML()).length).toBeLessThanOrEqual(8)
  view.rerender(<TextEditor editorRef={editorRef} value="<p>Updated</p>" readOnly name="body" aria-label="Document"/>);await waitFor(()=>expect(screen.getByRole("textbox",{name:"Document"})).toHaveTextContent("Updated"));expect(screen.getByRole("textbox",{name:"Document"})).toHaveAttribute("contenteditable","false");expect(document.querySelector('input[name="body"]')).toHaveValue(editorRef.current!.getHTML());expect(screen.getByRole("button",{name:"Bold"})).toHaveAttribute("aria-disabled","true");await userEvent.click(screen.getByRole("button",{name:"Bold"}));expect(editorRef.current!.isActive("bold")).toBe(false)
 })
 it("translates the editor character limit announcement",async()=>{
 render(<TextEditor defaultValue="<p>123</p>" maxLength={3} showCount limitLabel="بلغت الحد"/>);await waitFor(()=>expect(screen.getByRole("status")).toHaveTextContent("بلغت الحد"))
 })
 it("extracts inert plain text from editor HTML",()=>{expect(htmlToText("<p>Hello &amp; مرحبا</p>")).toBe("Hello & مرحبا")})
})
