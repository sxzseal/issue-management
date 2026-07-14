import { FileQuestion } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/components/ui/button'

export default function NotFoundRoute() {
  return (
    <div className="flex h-full min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <FileQuestion className="h-16 w-16 text-muted-foreground" aria-hidden />
      <div>
        <h2 className="text-lg font-semibold">页面不存在</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          检查地址是否正确，或返回看板首页
        </p>
      </div>
      <Button asChild>
        <Link to="/board">回到看板</Link>
      </Button>
    </div>
  )
}
