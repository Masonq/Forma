import asyncio, sys, json, subprocess, os
from playwright.async_api import async_playwright
ROUTES=['/','/program','/progress','/library','/exercise/back_squat','/skills','/body','/profile','/places','/workout']
AXE=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'node_modules')+'/axe-core/axe.min.js').read()
LAYOUT=r"""() => {
 const W=innerWidth, out=[];
 const vis=e=>{const s=getComputedStyle(e); if(s.visibility==='hidden'||s.display==='none'||+s.opacity===0) return false; const r=e.getBoundingClientRect(); return r.width>0&&r.height>0};
 const name=e=>(e.tagName.toLowerCase()+(e.className&&typeof e.className==='string'?'.'+e.className.trim().split(/\s+/).slice(0,2).join('.'):'')+' «'+(e.innerText||e.getAttribute('aria-label')||'').trim().slice(0,30)+'»');
 if(document.documentElement.scrollWidth>W+1) out.push(['overflow-x','page '+document.documentElement.scrollWidth]);
 for(const e of document.querySelectorAll('main *, .tabbar *, .sidebar *, .island *')){
   if(!vis(e)) continue; const r=e.getBoundingClientRect(); const s=getComputedStyle(e);
   // вылез за правый край, не внутри горизонтального скролла
   if(r.right>W+1){ let p=e.parentElement, sc=false; while(p){const o=getComputedStyle(p).overflowX; if(o==='auto'||o==='scroll'||o==='hidden'){sc=true;break} p=p.parentElement} if(!sc) out.push(['off-screen',name(e)]) }
   // обрезанный текст без многоточия
   if(e.children.length===0 && e.innerText && e.scrollWidth>e.clientWidth+2 && s.textOverflow!=='ellipsis' && s.overflow!=='visible') out.push(['clipped',name(e)]);
   // маленькие цели нажатия
   if((e.tagName==='BUTTON'||e.tagName==='A'||e.getAttribute('role')==='switch') && (r.height<36||r.width<36) && !e.closest('.chips') ) out.push(['small-target',name(e)+` ${Math.round(r.width)}x${Math.round(r.height)}`]);
   // мелкий шрифт
   if(e.children.length===0 && e.innerText && e.innerText.trim() && parseFloat(s.fontSize)<11) out.push(['tiny-text',name(e)+' '+s.fontSize]);
 }
 // текст по центру кнопки: сравниваем центр контента и центр кнопки
 for(const b of document.querySelectorAll('main .btn, .island .btn, .sidebar .btn')){ if(!vis(b)) continue; const r=b.getBoundingClientRect(); const kids=[...b.childNodes]; const rg=document.createRange(); rg.selectNodeContents(b); const c=rg.getBoundingClientRect(); const dx=Math.abs((c.left+c.right)/2-(r.left+r.right)/2), dy=Math.abs((c.top+c.bottom)/2-(r.top+r.bottom)/2); if(getComputedStyle(b).justifyContent==='center' && (dx>3||dy>3)) out.push(['off-center',name(b)+` dx${dx.toFixed(0)} dy${dy.toFixed(0)}`]) }
 return out;
}"""
async def main(W, theme):
    H=844 if W<800 else 900
    async with async_playwright() as p:
        b = await p.chromium.launch(args=['--remote-debugging-port=9222'])
        ctx = await b.new_context(viewport={'width':W,'height':H}, is_mobile=W<800, has_touch=W<800, locale='ru-RU', color_scheme='dark')
        pg = await ctx.new_page(); errs=[]
        pg.on('pageerror', lambda e: errs.append(str(e)))
        await pg.goto('http://127.0.0.1:5173/'); await pg.wait_for_timeout(1500)
        for step in range(14):
            btn = pg.locator('button.btn.primary:visible')
            if await btn.count()==0: break
            opts = pg.locator('.opt:visible, .choice:visible')
            if await opts.count()>0:
                try: await opts.first.click(timeout=800)
                except: pass
            if await pg.locator('.greet').count(): break
            try: await btn.last.click(timeout=1500)
            except: break
            await pg.wait_for_timeout(350)
        if theme=='light':
            await pg.evaluate("document.documentElement.dataset.theme='light'")
        rep={}
        for r in ROUTES:
            if r=='/workout':
                await pg.evaluate("history.pushState(null,'','/'); dispatchEvent(new PopStateEvent('popstate'))"); await pg.wait_for_timeout(500)
                await pg.locator('.hero .btn.primary').click(); await pg.wait_for_timeout(800)
            else:
                await pg.evaluate(f"history.pushState(null,'','{r}'); dispatchEvent(new PopStateEvent('popstate'))"); await pg.wait_for_timeout(900)
            if theme=='light': await pg.evaluate("document.documentElement.dataset.theme='light'"); await pg.wait_for_timeout(200)
            lay = await pg.evaluate(LAYOUT)
            await pg.add_script_tag(content=AXE)
            ax = await pg.evaluate("""async()=>{const r=await axe.run(document,{runOnly:['wcag2a','wcag2aa'],resultTypes:['violations']}); return r.violations.map(v=>[v.id,v.impact,v.nodes.length,v.nodes.slice(0,3).map(n=>n.target.join(' ')+' :: '+(n.failureSummary||'').split('\\n').slice(1,2).join(''))])}""")
            imp = subprocess.run(['npx','impeccable','detect','--cdp','9222','--json'],cwd=os.path.dirname(os.path.abspath(__file__)),capture_output=True,text=True,timeout=120)
            try: impj=json.loads(imp.stdout)
            except Exception: impj=imp.stdout[-400:]
            rep[r]={'layout':lay,'axe':ax,'impeccable':impj}
            await pg.screenshot(path=f"out/s_{W}_{theme}_{r.strip('/').replace('/','_') or 'today'}.png", full_page=True)
        rep['_errors']=errs
        json.dump(rep, open(f'out/rep_{W}_{theme}.json','w'), ensure_ascii=False, indent=1)
        await b.close()
W=int(sys.argv[1]); th=sys.argv[2]
asyncio.run(main(W,th))
