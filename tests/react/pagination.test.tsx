import { it, expect } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { animate, reduceMotion } from "./navigation-test-support"
import { PaginationControl, paginationRange, Pagination, PaginationContent, PaginationItem, PaginationLink } from "../../registry/react/components/pagination/pagination"
it("keeps ranges stable at both ends and in the middle", () => {
 expect(paginationRange({page:1,pageCount:20})).toEqual([1,2,3,4,5,"end-ellipsis",20])
 expect(paginationRange({page:10,pageCount:20})).toEqual([1,"start-ellipsis",9,10,11,"end-ellipsis",20])
 expect(paginationRange({page:20,pageCount:20})).toEqual([1,"start-ellipsis",16,17,18,19,20])
 expect(paginationRange({page:1,pageCount:0})).toEqual([])
})
it.each([false,true])("places current indicator and respects reduced motion=%s", async reduced => {
 reduceMotion(reduced)
 const user = userEvent.setup()
 render(<PaginationControl pageCount={20} defaultPage={5} getHref={n => `?page=${n}`} />)
 const current = screen.getByRole("link", { name: "Page 5" })
 expect(current).toHaveAttribute("aria-current", "page")
 const list = screen.getByRole("list")
 expect(list.style.getPropertyValue("--sheen-pagination-x")).toBe("200px")
 await waitFor(() => expect(list).toHaveAttribute("data-animate"))
 await user.click(screen.getByRole("link", { name: "Page 6" }))
 await waitFor(() => expect(list.style.getPropertyValue("--sheen-pagination-x")).toBe("240px"))
 expect(screen.getByRole("link", { name: "Page 6" })).toHaveAttribute("aria-current", "page")
 if (reduced) expect(animate).not.toHaveBeenCalled()
 else expect(animate).toHaveBeenCalled()
})

it("FLIPs retained page numbers when their layout position shifts", async () => {
 const control = (shifted: boolean) => <Pagination><PaginationContent><PaginationItem><PaginationLink href="?page=5" isActive={!shifted} data-x={shifted ? 1 : 2}>5</PaginationLink></PaginationItem><PaginationItem><PaginationLink href="?page=6" isActive={shifted} data-x={shifted ? 2 : 3}>6</PaginationLink></PaginationItem></PaginationContent></Pagination>
 const {rerender} = render(control(false))
 await waitFor(() => expect(screen.getByRole("list")).toHaveAttribute("data-animate"))
 rerender(control(true))
 await waitFor(() => expect(animate).toHaveBeenCalledWith([{translate:"40px 0"},{translate:"0 0"}], expect.objectContaining({duration:500})))
})
