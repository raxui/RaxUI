"use client"
import * as React from "react"
import { SheenThemeProvider } from "@/lib/theme"
import { Navbar, NavbarLinks, NavbarLink, NavbarToggle, NavbarMenu, NavbarMenuLink } from "@/components/ui/navbar"
import { SidebarProvider, Sidebar, SidebarContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarMenuCollapsible, SidebarMenuSubButton, SidebarInset, SidebarTrigger, SidebarMenuSkeleton } from "@/components/ui/sidebar"
import { NavigationMenu, NavigationMenuList, NavigationMenuItem, NavigationMenuTrigger, NavigationMenuContent, NavigationMenuListItem } from "@/components/ui/navigation-menu"
import { Menubar, MenubarMenu, MenubarTrigger, MenubarContent, MenubarItem, MenubarCheckboxItem, MenubarSub, MenubarSubTrigger, MenubarSubContent } from "@/components/ui/menubar"
import { Footer, FooterColumn, FooterLink, FooterNewsletter, FooterCopyright } from "@/components/ui/footer"
import { Banner } from "@/components/ui/banner"

export default function ShellDemo(){
 const [current,setCurrent]=React.useState("Home"),[checked,setChecked]=React.useState(false),[action,setAction]=React.useState("")
 return <SheenThemeProvider mode="dark" appearance="glass" direction="rtl" data-testid="shell-theme" style={{padding:16}}>
  <Navbar expand="md"><NavbarLinks label="Site">{["Home","Docs"].map(label=><NavbarLink key={label} href="#" active={current===label} onClick={e=>{e.preventDefault();setCurrent(label)}}>{label}</NavbarLink>)}</NavbarLinks><NavbarToggle/><NavbarMenu>{["Home","Docs"].map(label=><NavbarMenuLink key={label} href="#" onClick={e=>{e.preventDefault();setCurrent(label)}}>{label}</NavbarMenuLink>)}</NavbarMenu></Navbar>
  <NavigationMenu><NavigationMenuList><NavigationMenuItem><NavigationMenuTrigger>Products</NavigationMenuTrigger><NavigationMenuContent><ul className="sheen-nav-grid"><NavigationMenuListItem href="#kit" title="UI kit" description="Components"/></ul></NavigationMenuContent></NavigationMenuItem></NavigationMenuList></NavigationMenu>
  <Menubar><MenubarMenu><MenubarTrigger>File</MenubarTrigger><MenubarContent><MenubarItem onSelect={()=>setAction("New document")}>New</MenubarItem><MenubarSub><MenubarSubTrigger>Export</MenubarSubTrigger><MenubarSubContent><MenubarItem onSelect={()=>setAction("PDF exported")}>PDF</MenubarItem></MenubarSubContent></MenubarSub></MenubarContent></MenubarMenu><MenubarMenu><MenubarTrigger>View</MenubarTrigger><MenubarContent><MenubarCheckboxItem checked={checked} onCheckedChange={value=>setChecked(value===true)}>Toolbar</MenubarCheckboxItem></MenubarContent></MenubarMenu></Menubar>
  <output aria-label="Menu action">{action}</output><output aria-label="Toolbar state">{String(checked)}</output>
  <SidebarProvider storageKey="acceptance-sidebar" style={{"--sheen-sidebar-height":"24rem"} as React.CSSProperties}><Sidebar collapsible="icon" label="Workspace"><SidebarContent><SidebarMenu>{["Inbox","Projects"].map(label=><SidebarMenuItem key={label}><SidebarMenuButton isActive={current===label} onClick={()=>setCurrent(label)}><span>{label}</span></SidebarMenuButton></SidebarMenuItem>)}<SidebarMenuCollapsible title="Settings"><li><SidebarMenuSubButton href="#profile">Profile</SidebarMenuSubButton></li></SidebarMenuCollapsible></SidebarMenu><SidebarMenuSkeleton/></SidebarContent></Sidebar><SidebarInset><SidebarTrigger/><input aria-label="Sidebar search"/></SidebarInset></SidebarProvider>
  <Footer><FooterColumn title="Resources"><FooterLink href="#guide">Guide</FooterLink></FooterColumn><FooterNewsletter onSubscribe={async()=>{}}/><FooterCopyright owner="SheenUI"/></Footer>
  <Banner persistKey="acceptance-tip" title="Remembered tip" dismissible>Tip content</Banner>
  <Banner position="bottom" title="Floating notice" dismissible>Floating content</Banner>
 </SheenThemeProvider>
}
