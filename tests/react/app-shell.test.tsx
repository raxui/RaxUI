import * as React from "react"
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { SheenThemeProvider } from "../../registry/react/foundation/theme"
import { Navbar, NavbarLinks, NavbarLink, NavbarToggle, NavbarMenu, NavbarMenuLink } from "../../registry/react/components/navbar/navbar"
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenuCollapsible, SidebarMenuSubButton, SidebarInset, SidebarTrigger, SidebarMenuSkeleton } from "../../registry/react/components/sidebar/sidebar"
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuListItem } from "../../registry/react/components/navigation-menu/navigation-menu"
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarCheckboxItem, MenubarRadioGroup, MenubarRadioItem } from "../../registry/react/components/menubar/menubar"
import { Footer, FooterColumn, FooterLink, FooterNewsletter, FooterBackToTop, FooterCopyright } from "../../registry/react/components/footer/footer"
import { Banner, resetBanner } from "../../registry/react/components/banner/banner"

let phone=false
beforeAll(()=>{
  vi.stubGlobal("matchMedia",vi.fn((query:string)=>({matches:query.includes("max-width")?phone:query.includes("reduced-motion"),media:query,addEventListener:vi.fn(),removeEventListener:vi.fn()})))
  vi.stubGlobal("ResizeObserver",class { observe(){} unobserve(){} disconnect(){} })
  HTMLElement.prototype.hasPointerCapture ??= ()=>false
  HTMLElement.prototype.setPointerCapture ??= ()=>{}
  HTMLElement.prototype.releasePointerCapture ??= ()=>{}
})
beforeEach(()=>{phone=false;localStorage.clear()})

describe("app shell",()=>{
  it("repositions the current page indicator when the theme direction changes",()=>{
    const Demo=({direction}:{direction:"ltr"|"rtl"})=><SheenThemeProvider direction={direction}><Navbar><NavbarLinks><NavbarLink active href="#docs">Docs</NavbarLink></NavbarLinks></Navbar></SheenThemeProvider>
    const view=render(<Demo direction="ltr"/>),link=screen.getByRole("link",{name:"Docs"})
    Object.defineProperty(link,"offsetLeft",{configurable:true,value:140})
    view.rerender(<Demo direction="rtl"/>)
    expect(document.querySelector<HTMLElement>(".sheen-navbar-links")?.style.getPropertyValue("--sheen-navbar-current-x")).toBe("140px")
  })

  it("opens the navbar menu, closes with Escape and restores toggle focus",async()=>{
    const user=userEvent.setup(),ref=React.createRef<HTMLElement>()
    render(<SheenThemeProvider mode="dark" direction="rtl"><Navbar ref={ref} expand="never"><NavbarLinks><NavbarLink href="#docs" active>Docs</NavbarLink></NavbarLinks><NavbarToggle/><NavbarMenu><NavbarMenuLink href="#guide">Guide</NavbarMenuLink></NavbarMenu></Navbar></SheenThemeProvider>)
    const toggle=screen.getByRole("button",{name:"Menu"})
    expect(ref.current?.closest('[dir="rtl"]')).not.toBeNull()
    expect(screen.getByRole("link",{name:"Docs"})).toHaveAttribute("aria-current","page")
    await user.click(toggle);expect(toggle).toHaveAttribute("aria-expanded","true")
    await user.click(screen.getByRole("link",{name:"Guide"}));expect(toggle).toHaveAttribute("aria-expanded","false")
    await user.click(toggle);await user.keyboard("{Escape}")
    expect(toggle).toHaveAttribute("aria-expanded","false");expect(toggle).toHaveFocus()
    expect(document.querySelector('.sheen-navbar-menu')).toHaveAttribute("inert")
  })
  it("keeps controlled navbar state owned by the caller",async()=>{
    const change=vi.fn(),user=userEvent.setup()
    render(<Navbar open={false} onOpenChange={change}><NavbarToggle/></Navbar>)
    await user.click(screen.getByRole("button"));expect(change).toHaveBeenCalledWith(true)
    expect(screen.getByRole("button")).toHaveAttribute("aria-expanded","false")
  })
  it("persists sidebar collapse and ignores the shortcut while typing",async()=>{
    const user=userEvent.setup()
    render(<SidebarProvider storageKey="sidebar"><Sidebar collapsible="icon"><SidebarContent><SidebarMenuSkeleton/></SidebarContent></Sidebar><SidebarInset><SidebarTrigger/><input aria-label="Search"/></SidebarInset></SidebarProvider>)
    const toggle=screen.getByRole("button",{name:"Toggle sidebar"})
    await user.click(toggle);expect(toggle).toHaveAttribute("aria-expanded","false");expect(localStorage.getItem("sidebar")).toBe("false")
    await user.click(screen.getByRole("textbox"));await user.keyboard("{Control>}b{/Control}");expect(toggle).toHaveAttribute("aria-expanded","false")
    toggle.focus();await user.keyboard("{Control>}b{/Control}");expect(toggle).toHaveAttribute("aria-expanded","true")
  })
  it("unfolds an icon sidebar when opening a group and exposes its links",async()=>{
    const user=userEvent.setup()
    render(<SidebarProvider defaultOpen={false}><Sidebar collapsible="icon"><SidebarContent><ul><SidebarMenuCollapsible title="Projects"><li><SidebarMenuSubButton href="#one">Project one</SidebarMenuSubButton></li></SidebarMenuCollapsible></ul></SidebarContent></Sidebar><SidebarTrigger/></SidebarProvider>)
    const group=screen.getByRole("button",{name:"Projects"})
    await user.click(group);expect(group).toHaveAttribute("aria-expanded","true")
    expect(screen.getByRole("button",{name:"Toggle sidebar"})).toHaveAttribute("aria-expanded","true")
    expect(document.querySelector('.sheen-sidebar-collapsible-body')).not.toHaveAttribute("inert")
  })
  it("uses a themed RTL mobile sheet and returns focus to its trigger",async()=>{
    phone=true;const user=userEvent.setup()
    render(<SheenThemeProvider mode="dark" direction="rtl"><SidebarProvider style={{direction:"rtl"}}><Sidebar label="Workspace" description="Workspace links"><SidebarContent>Inbox</SidebarContent></Sidebar><SidebarInset><SidebarTrigger/></SidebarInset></SidebarProvider></SheenThemeProvider>)
    const toggle=screen.getByRole("button",{name:"Toggle sidebar"});await user.click(toggle)
    const dialog=await screen.findByRole("dialog",{name:"Workspace"})
    expect(dialog).toHaveAttribute("data-side","right");expect(dialog.closest('[data-bs-theme="dark"]')).not.toBeNull()
    await user.keyboard("{Escape}");await waitFor(()=>expect(toggle).toHaveFocus())
  })
  it("opens a navigation panel with labelled links and follows theme direction",async()=>{
    const user=userEvent.setup()
    render(<SheenThemeProvider direction="rtl"><NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Products</NavigationMenuTrigger><NavigationMenuContent><ul><NavigationMenuListItem href="#kit" title="UI kit" description="Components" active/></ul></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu></SheenThemeProvider>)
    await user.click(screen.getByRole("button",{name:"Products"}))
    expect(await screen.findByRole("link",{name:/UI kit/})).toHaveAttribute("aria-current","page")
    expect(document.querySelector('.sheen-nav')).toHaveAttribute("dir","rtl")
  })
  it("portals menubar items into the nearest theme and selects checkbox and radio values",async()=>{
    const user=userEvent.setup(),check=vi.fn(),radio=vi.fn()
    render(<SheenThemeProvider mode="dark" direction="rtl"><Menubar appearance="flat"><MenubarMenu><MenubarTrigger>View</MenubarTrigger><MenubarContent><MenubarItem disabled>Disabled</MenubarItem><MenubarCheckboxItem onCheckedChange={check}>Toolbar</MenubarCheckboxItem><MenubarRadioGroup value="one" onValueChange={radio}><MenubarRadioItem value="one">One</MenubarRadioItem><MenubarRadioItem value="two">Two</MenubarRadioItem></MenubarRadioGroup></MenubarContent></MenubarMenu></Menubar></SheenThemeProvider>)
    await user.click(screen.getByRole("menuitem",{name:"View"}))
    const menu=await screen.findByRole("menu")
    expect(menu).toHaveAttribute("data-sheen-appearance","flat");expect(menu.closest('[data-bs-theme="dark"]')).not.toBeNull()
    await user.click(screen.getByRole("menuitemcheckbox",{name:"Toolbar"}));expect(check).toHaveBeenCalledWith(true)
    await user.click(screen.getByRole("menuitem",{name:"View"}));await user.click(screen.getByRole("menuitemradio",{name:"Two"}));expect(radio).toHaveBeenCalledWith("two")
  })
  it("folds footer columns on phones and forwards its root ref",async()=>{
    phone=true;const user=userEvent.setup(),ref=React.createRef<HTMLElement>()
    render(<Footer ref={ref}><FooterColumn title="Product"><FooterLink href="#docs">Docs</FooterLink></FooterColumn><FooterCopyright owner="SheenUI" year={2026}/></Footer>)
    const toggle=await screen.findByRole("button",{name:"Product"});expect(toggle).toHaveAttribute("aria-expanded","false")
    expect(document.querySelector('.sheen-footer-list-wrap')).toHaveAttribute("inert")
    await user.click(toggle);expect(toggle).toHaveAttribute("aria-expanded","true");expect(ref.current?.tagName).toBe("FOOTER")
    expect(screen.getByText(/© 2026 SheenUI/)).toBeInTheDocument()
  })
  it("validates the newsletter, reports failures and allows a successful retry",async()=>{
    const user=userEvent.setup(),subscribe=vi.fn().mockRejectedValueOnce(new Error("offline")).mockResolvedValue(undefined)
    render(<FooterNewsletter onSubscribe={subscribe} errorMessage="Try later"/>)
    await user.click(screen.getByRole("button",{name:"Subscribe"}));expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email")
    await user.type(screen.getByRole("textbox"),"user@example.com");await user.click(screen.getByRole("button",{name:"Subscribe"}))
    expect(await screen.findByRole("alert")).toHaveTextContent("Try later")
    await user.click(screen.getByRole("button",{name:"Subscribe"}));expect(await screen.findByRole("status")).toHaveTextContent("Thanks!")
    expect(subscribe).toHaveBeenCalledTimes(2)
  })
  it("respects reduced motion when returning to the top",async()=>{
    const ref={current:document.createElement("div")},scroll=vi.fn();ref.current.scrollTo=scroll
    render(<FooterBackToTop target={ref}/>);await userEvent.click(screen.getByRole("button"));expect(scroll).toHaveBeenCalledWith({top:0,behavior:"auto"})
  })
  it("dismisses and remembers a banner and supports resetting that memory",async()=>{
    const user=userEvent.setup(),view=render(<Banner persistKey="tip" title="Tip" dismissible>Saved tip</Banner>)
    await user.click(screen.getByRole("button",{name:"Dismiss"}));await waitFor(()=>expect(screen.queryByRole("status")).not.toBeInTheDocument())
    expect(localStorage.getItem("sheen-banner:tip")).toBe("dismissed")
    view.unmount();const hidden=render(<Banner persistKey="tip">Saved tip</Banner>);await waitFor(()=>expect(screen.queryByRole("status")).not.toBeInTheDocument());hidden.unmount()
    resetBanner("tip");render(<Banner persistKey="tip">Saved tip</Banner>);expect(screen.getByRole("status")).toHaveTextContent("Saved tip")
  })
  it("keeps a controlled banner open if its owner rejects dismissal",async()=>{
    const change=vi.fn();render(<Banner open onOpenChange={change} dismissible tone="danger">Problem</Banner>)
    fireEvent.click(screen.getByRole("button",{name:"Dismiss"}));expect(change).toHaveBeenCalledWith(false);expect(screen.getByRole("alert")).toHaveAttribute("data-state","open")
  })
  it("renders floating banners inside the nearest theme",async()=>{
    render(<SheenThemeProvider mode="dark" direction="rtl"><Banner position="bottom">Floating</Banner></SheenThemeProvider>)
    const status=await screen.findByRole("status");expect(status).toHaveAttribute("dir","rtl");expect(status.closest('[data-bs-theme="dark"]')).not.toBeNull()
  })
})

describe("navigation panel placement",()=>{
 it.each([
  ["ltr",300,200],
  ["rtl",300,80],
  ["ltr",950,716],
  ["rtl",30,-92],
 ] as const)("aligns to %s trigger start at %i and clamps at the screen edge",async(dir,triggerLeft,offset)=>{
  const user=userEvent.setup(),originalWidth=window.innerWidth
  Object.defineProperty(window,"innerWidth",{configurable:true,value:1024})
  try{
   const {container}=render(<NavigationMenu dir={dir}><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Open panel</NavigationMenuTrigger><NavigationMenuContent><ul><NavigationMenuListItem href="#example" title="Example"/></ul></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>)
   const root=container.querySelector<HTMLElement>(".sheen-nav")!,trigger=screen.getByRole("button",{name:"Open panel"})
   root.getBoundingClientRect=()=>new DOMRect(100,0,400,40);trigger.getBoundingClientRect=()=>new DOMRect(triggerLeft,0,80,40)
   await user.click(trigger)
   const viewport=container.querySelector<HTMLElement>(".sheen-nav-viewport")!,wrap=container.querySelector<HTMLElement>(".sheen-nav-viewport-wrap")!
   viewport.style.setProperty("--radix-navigation-menu-viewport-width","200px")
   await waitFor(()=>expect(wrap.style.getPropertyValue("--sheen-nav-viewport-x")).toBe(offset+"px"))
  }finally{Object.defineProperty(window,"innerWidth",{configurable:true,value:originalWidth})}
 })
})
