// Lazy-loaded /help subtree. Mounted by main.tsx at `/help/*`, so these routes
// are relative to /help. Bundled into its own chunk (Remotion lives here too).

import { Route, Routes } from 'react-router-dom'
import { HelpLayout } from './HelpLayout'
import { HelpHome } from './pages/HelpHome'
import { CategoryLanding } from './pages/CategoryLanding'
import { Article } from './pages/Article'
import { CasesIndex } from './pages/CasesIndex'
import { CaseStudy } from './pages/CaseStudy'
import './help.css'

export default function HelpApp() {
  return (
    <Routes>
      <Route element={<HelpLayout />}>
        <Route index element={<HelpHome />} />
        <Route path="c/:categoryId" element={<CategoryLanding />} />
        <Route path="c/:categoryId/:articleId" element={<Article />} />
        <Route path="cases" element={<CasesIndex />} />
        <Route path="cases/:slug" element={<CaseStudy />} />
        <Route path="*" element={<HelpHome />} />
      </Route>
    </Routes>
  )
}
