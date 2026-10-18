import { useEffect, useMemo, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import {
  ArrowRight, ArrowUpRight, Check, ChevronDown, Clock3, Coffee, Heart,
  Leaf, MapPin, Menu as MenuIcon, Minus, Plus, Search, ShoppingBag, Sparkles, X,
} from 'lucide-react'
import type { Session } from '@supabase/supabase-js'
import { createOrder, fetchOrder } from './lib/orders'
import type { CartLine } from './lib/orders'
import { supabase } from './lib/supabase'

type Product = {
  id: string; name: string; description: string | null; price: number | null
  category_id: string | null; photo_url: string | null; dietary_labels: string[]
  is_available: boolean; is_published: boolean; status: string
}
type Category = { id: string; name: string; sort_order: number }
type Settings = {
  business_name: string; address: string; phone: string; opening_hours: string
  pickup_enabled: boolean; delivery_enabled: boolean; delivery_fee: number; tax_rate: number
  promotion_code: string | null; promotion_description: string | null; promotion_percent: number
  rating_reference: number; review_count_reference: number; rating_verified: boolean
}
type OrderRecord = { id: string; order_number: string; customer_name: string; customer_phone: string; fulfillment: 'pickup' | 'delivery'; delivery_address: string | null; status: string; total: number; created_at: string }
type OrderItemRecord = { product_name: string; unit_price: number; quantity: number; line_total: number }
type OrderWithItems = OrderRecord & { order_items: OrderItemRecord[] }
type Page = 'home' | 'menu' | 'about' | 'contact' | 'track' | 'admin'
const pages: Page[] = ['home', 'menu', 'about', 'contact', 'track', 'admin']
function readPage(): Page {
  const requested = location.hash.replace('#', '') as Page
  return pages.includes(requested) ? requested : 'home'
}

const businessDefaults: Settings = {
  business_name: 'The Caffeine Craft Cafe',
  address: 'Prosperity Society, Gulab Vihar, near Vitthal Mandir Road, Ganesh Nagar, Karvenagar, Pune, Maharashtra 411052',
  phone: '077749 63125',
  opening_hours: '11:00 AM – 11:30 PM',
  pickup_enabled: false,
  delivery_enabled: false,
  delivery_fee: 0,
  tax_rate: 0,
  promotion_code: null,
  promotion_description: null,
  promotion_percent: 0,
  rating_reference: 4.9,
  review_count_reference: 203,
  rating_verified: false,
}
const fallbackCategories: Category[] = [
  { id: 'cold-beverages', name: 'Cold Beverages', sort_order: 1 },
  { id: 'milkshakes', name: 'Milkshakes', sort_order: 2 },
  { id: 'hot-beverages', name: 'Hot Beverages', sort_order: 3 },
]
const fallbackProducts: Product[] = [
  ['Iced Americano', 80, 'cold-beverages'], ['Ice Mocha', 110, 'cold-beverages'],
  ['Cold Coffee Frappe', 120, 'cold-beverages'], ['Hazelnut Frappe', 140, 'cold-beverages'],
  ['Vanilla Frappe', 140, 'cold-beverages'], ['Butterscotch Frappe', 140, 'cold-beverages'],
  ['Caramel Frappe', 140, 'cold-beverages'], ['Choco Chip Frappe', 150, 'cold-beverages'],
  ['Double Choco Chip Frappe', 160, 'cold-beverages'], ['Green Apple Soda', 110, 'cold-beverages'],
  ['Classic Mojito', 110, 'cold-beverages'], ['Kiwi Mojito', 110, 'cold-beverages'],
  ['Strawberry Mint Mojito', 110, 'cold-beverages'], ['Passion Fruit Mojito', 90, 'cold-beverages'],
  ['Lemon Iced Tea', 90, 'cold-beverages'], ['Peach Iced Tea', 90, 'cold-beverages'],
  ['Passion Fruit Iced Tea', 90, 'cold-beverages'], ['Rocher Delight', 180, 'cold-beverages'],
  ['Forest Berries Shake', 140, 'milkshakes'], ['Bubblegum Shake', 140, 'milkshakes'],
  ['Oreo Shake', 140, 'milkshakes'], ['Nutty Nutella Shake', 150, 'milkshakes'],
  ['Red Velvet Shake', 140, 'milkshakes'], ['Blueberry Cheesecake Shake', 160, 'milkshakes'],
  ['KitKat Shake', 170, 'milkshakes'], ['Lotus Biscoff Shake', 170, 'milkshakes'],
  ['Choco Brownie Crumble Shake', 170, 'milkshakes'], ['Cookie Crumble Shake', 170, 'milkshakes'],
  ['Americano Black Coffee', 80, 'hot-beverages'], ['Cappuccino', 90, 'hot-beverages'],
  ['Latte', 90, 'hot-beverages'], ['Mocha', 110, 'hot-beverages'],
  ['Irish Coffee', 120, 'hot-beverages'], ['Vanilla Cappuccino', 120, 'hot-beverages'],
  ['Hazelnut Cappuccino', 120, 'hot-beverages'], ['Rose Cappuccino', 120, 'hot-beverages'],
  ['Hazelnut Latte', 120, 'hot-beverages'], ['Vanilla Latte', 120, 'hot-beverages'],
  ['Nutella Latte', 120, 'hot-beverages'], ['Biscoff Latte', 120, 'hot-beverages'],
  ['Plain Hot Chocolate', 110, 'hot-beverages'], ['Oreo Hot Chocolate', 120, 'hot-beverages'],
  ['Coconut Hot Chocolate', 140, 'hot-beverages'], ['Caramel Hot Chocolate', 140, 'hot-beverages'],
  ['Roasted Hazelnut Hot Chocolate', 140, 'hot-beverages'], ['Nutella Hot Chocolate', 140, 'hot-beverages'],
].map(([name, price, category_id], index) => ({
  id: `pdf-menu-${index + 1}`, name: name as string, description: null, price: price as number,
  category_id: category_id as string, photo_url: null, dietary_labels: [],
  is_available: true, is_published: true, status: 'published',
}))
const demoPhotos = {
  hero: 'https://images.unsplash.com/photo-1442512595331-e89e73853f31?auto=format&fit=crop&w=1800&q=85',
  coffee: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80',
  pour: 'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=900&q=80',
  cafe: 'https://images.unsplash.com/photo-1445116572660-236099ec97a0?auto=format&fit=crop&w=1100&q=80',
  table: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=900&q=80',
}
function menuPhoto(product: Product) {
  const photos: Record<string, string> = {
    'iced americano': 'iced-americano.jpg',
    'ice mocha': 'iced-mocha.jpg',
    'cold coffee frappe': 'iced-coffee.jpg',
    'hazelnut frappe': 'stock-13636564.jpg',
    'vanilla frappe': 'stock-32805998.jpg',
    'butterscotch frappe': 'stock-33153485.jpg',
    'caramel frappe': 'stock-34096960.jpg',
    'choco chip frappe': 'stock-33166946.jpg',
    'double choco chip frappe': 'stock-19490328.jpg',
    'green apple soda': 'mojito-fresh.jpg',
    'classic mojito': 'mojito.jpg',
    'kiwi mojito': 'stock-8351541.jpg',
    'strawberry mint mojito': 'strawberry-mojito.jpg',
    'passion fruit mojito': 'passion-mojito.jpg',
    'lemon iced tea': 'lemon-tea.jpg',
    'peach iced tea': 'peach-tea.jpg',
    'passion fruit iced tea': 'passion-tea-pexels.jpg',
    'rocher delight': 'candy-shake.jpg',
    'forest berries shake': 'berry-shake.jpg',
    'bubblegum shake': 'stock-8228319.jpg',
    'oreo shake': 'oreo-shake.jpg',
    'nutty nutella shake': 'chocolate-shake.jpg',
    'red velvet shake': 'red-velvet-shake.jpg',
    'blueberry cheesecake shake': 'stock-11136329.jpg',
    'kitkat shake': 'stock-34224586.jpg',
    'lotus biscoff shake': 'caramel-frappe.jpg',
    'choco brownie crumble shake': 'cookie-shake-real.jpg',
    'cookie crumble shake': 'cookie-shake.jpg',
    'americano black coffee': 'hot-coffee.jpg',
    'cappuccino': 'stock-6867.jpg',
    'latte': 'stock-2013798.jpg',
    'mocha': 'stock-162886.jpg',
    'irish coffee': 'stock-11999751.jpg',
    'vanilla cappuccino': 'stock-27548803.jpg',
    'hazelnut cappuccino': 'stock-37252284.jpg',
    'rose cappuccino': 'stock-36010232.jpg',
    'hazelnut latte': 'stock-29621581.jpg',
    'vanilla latte': 'stock-9180208.jpg',
    'nutella latte': 'stock-9050514.jpg',
    'biscoff latte': 'stock-35285617.jpg',
    'plain hot chocolate': 'hot-chocolate.jpg',
    'oreo hot chocolate': 'stock-19595917.jpg',
    'coconut hot chocolate': 'stock-15071451.jpg',
    'caramel hot chocolate': 'stock-11158851.jpg',
    'roasted hazelnut hot chocolate': 'stock-15228658.jpg',
    'nutella hot chocolate': 'stock-4282717.jpg',
  }
  return `/images/menu/${photos[product.name.toLowerCase()] || 'hot-coffee.jpg'}`
}

function App() {
  const [page, setPage] = useState<Page>(readPage)
  const [products, setProducts] = useState<Product[]>(fallbackProducts)
  const [adminProducts, setAdminProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>(fallbackCategories)
  const [settings, setSettings] = useState<Settings>(businessDefaults)
  const [cart, setCart] = useState<CartLine[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [orderReference, setOrderReference] = useState<{ order_number: string; total: number } | null>(null)
  const [session, setSession] = useState<Session | null>(null)
  const [adminAllowed, setAdminAllowed] = useState(false)
  const [publicError, setPublicError] = useState('')

  useEffect(() => {
    if (!notice) return
    const timeout = window.setTimeout(() => setNotice(''), 1200)
    return () => window.clearTimeout(timeout)
  }, [notice])

  useEffect(() => {
    const onHash = () => setPage(readPage())
    addEventListener('hashchange', onHash)
    if (supabase) {
      void loadPublicData()
      void supabase.auth.getSession().then(({ data }) => setSession(data.session))
      const { data } = supabase.auth.onAuthStateChange((_event, next) => {
        setSession(next)
        setAdminAllowed(false)
      })
      return () => { removeEventListener('hashchange', onHash); data.subscription.unsubscribe() }
    }
    return () => removeEventListener('hashchange', onHash)
  }, [])

  useEffect(() => {
    if (!session || !supabase) { setAdminAllowed(false); return }
    void supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      .then(({ data, error }) => setAdminAllowed(!error && data?.role === 'admin'))
  }, [session])

  useEffect(() => {
    if (adminAllowed) void loadAdminProducts()
    else setAdminProducts([])
  }, [adminAllowed])

  async function loadPublicData() {
    if (!supabase) return
    const [productResult, categoryResult, settingsResult] = await Promise.all([
      supabase.from('products').select('id,name,description,price,category_id,photo_url,dietary_labels,is_available,is_published,status').eq('is_published', true).eq('is_available', true),
      supabase.from('categories').select('id,name,sort_order').order('sort_order'),
      supabase.from('business_settings').select('*').eq('id', 1).maybeSingle(),
    ])
    const failed = productResult.error || categoryResult.error || settingsResult.error
    setPublicError(failed ? 'Some cafe details could not be loaded. Please refresh or contact the cafe.' : '')
    if (!productResult.error && productResult.data) setProducts(productResult.data.length ? productResult.data as Product[] : fallbackProducts)
    if (!categoryResult.error && categoryResult.data?.length) setCategories(categoryResult.data)
    if (!settingsResult.error && settingsResult.data) setSettings({ ...businessDefaults, ...settingsResult.data })
  }

  async function loadAdminProducts() {
    if (!supabase) return
    const { data, error } = await supabase.from('products')
      .select('id,name,description,price,category_id,photo_url,dietary_labels,is_available,is_published,status')
      .order('created_at', { ascending: false })
    if (error) setPublicError('The admin menu could not be loaded. Check your staff role and database permissions.')
    else if (data) setAdminProducts(data as Product[])
  }

  function go(next: Page) {
    location.hash = next
    setPage(next)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }
  function add(productId: string) {
    if ((cart.find((item) => item.productId === productId)?.quantity ?? 0) >= 20) {
      setNotice('The maximum quantity per item is 20')
      return
    }
    setCart((current) => {
      const line = current.find((item) => item.productId === productId)
      return line
        ? current.map((item) => item.productId === productId ? { ...item, quantity: item.quantity + 1 } : item)
        : [...current, { productId, quantity: 1 }]
    })
    setNotice('Added to your bag')
  }
  function changeQty(productId: string, delta: number) {
    if (delta > 0 && (cart.find((item) => item.productId === productId)?.quantity ?? 0) >= 20) {
      setNotice('The maximum quantity per item is 20')
      return
    }
    setCart((items) => items.map((line) => line.productId === productId ? { ...line, quantity: line.quantity + delta } : line).filter((line) => line.quantity > 0))
  }
  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0)
  const productCountById = useMemo(() => new Map(products.map((product) => [product.id, product])), [products])

  return (
    <div className="min-h-screen bg-[#f8f6f1] text-[#38271d]">
      <Announcement />
      <Header page={page} cartCount={cartCount} onNavigate={go} onCart={() => setCartOpen(true)} />
      {page === 'home' && <Home onNavigate={go} products={products} settings={settings} add={add} />}
      {page === 'menu' && <MenuPage products={products} categories={categories} add={add} error={publicError} />}
      {page === 'about' && <AboutPage />}
      {page === 'contact' && <ContactPage settings={settings} />}
      {page === 'track' && <TrackPage />}
      {page === 'admin' && (
        <AdminPage session={session} allowed={adminAllowed} products={adminProducts} categories={categories}
          settings={settings} onRefresh={async () => { await loadPublicData(); await loadAdminProducts() }} onSettings={setSettings} onNotice={setNotice} />
      )}
      <Footer onNavigate={go} settings={settings} />
      {cartOpen && <CartDrawer items={cart} products={productCountById} settings={settings} onClose={() => setCartOpen(false)}
        onChange={changeQty} onClear={() => setCart([])} onOrder={setOrderReference} onNotice={setNotice} />}
      {orderReference && <Confirmation order={orderReference} onClose={() => { setOrderReference(null); setCart([]); setCartOpen(false); go('track') }} />}
      {notice && <div role="status" className="fixed bottom-5 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-[#342319] px-5 py-3 text-sm font-semibold text-white shadow-xl">{notice}</div>}
    </div>
  )
}

function Announcement() {
  return <div className="bg-[#3b2a20] px-4 py-2 text-center text-[11px] tracking-[.12em] text-[#f6e8d2]">
    A LITTLE CUP OF COMFORT IN <MapPin aria-hidden="true" size={12} className="mx-1 inline-block align-[-1px] text-[#c69969]" /> KARVE NAGAR · PUNE, INDIA
  </div>
}

function Header({ page, cartCount, onNavigate, onCart }: { page: Page; cartCount: number; onNavigate: (page: Page) => void; onCart: () => void }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const links: [Page, string][] = [['home', 'Home'], ['menu', 'Menu'], ['about', 'Our story'], ['contact', 'Visit us']]
  return <header className="sticky top-0 z-40 border-b border-[#ebe5db] bg-[#f8f6f1]/95 backdrop-blur">
    <div className="container-page flex h-[76px] items-center justify-between">
      <button onClick={() => onNavigate('home')} className="flex items-center gap-3 text-left" aria-label="The Caffeine Craft Cafe home">
        <img src="/images/brand/caffeine-craft-emblem.jpg" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" />
        <span><span className="serif block text-[17px] font-semibold leading-tight">The Caffeine Craft</span><span className="text-[9px] font-bold tracking-[.21em] text-[#8d6849]">CAFE · KARVE NAGAR</span></span>
      </button>
      <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
        {links.map(([target, label]) => <button key={target} onClick={() => onNavigate(target)} className={`text-[13px] transition hover:text-[#8b5c38] ${page === target ? 'font-bold text-[#6e452a]' : 'text-[#67594e]'}`}>{label}</button>)}
      </nav>
      <div className="flex items-center gap-3">
        <button onClick={onCart} className="relative flex h-10 w-10 items-center justify-center rounded-full border border-[#e7dfd3] hover:bg-white" aria-label={`Shopping bag, ${cartCount} items`}>
          <ShoppingBag size={18} />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-[18px] min-w-[18px] place-items-center rounded-full bg-[#49634c] px-1 text-[10px] font-bold text-white">{cartCount}</span>}
        </button>
        <button onClick={() => onNavigate('menu')} className="hidden rounded-full bg-[#47634d] px-5 py-3 text-[12px] font-bold text-white transition hover:bg-[#344c39] sm:block">Explore menu <ArrowUpRight className="ml-1 inline" size={14} /></button>
        <button onClick={() => setMobileOpen(!mobileOpen)} className="grid h-10 w-10 place-items-center rounded-full border border-[#e7dfd3] md:hidden" aria-label="Toggle navigation">{mobileOpen ? <X size={18} /> : <MenuIcon size={18} />}</button>
      </div>
    </div>
    {mobileOpen && <nav className="container-page grid gap-1 pb-4 md:hidden">{links.map(([target, label]) => <button key={target} onClick={() => { onNavigate(target); setMobileOpen(false) }} className="rounded-lg px-3 py-3 text-left text-sm hover:bg-white">{label}</button>)}</nav>}
  </header>
}

function Home({ onNavigate, products, settings, add }: { onNavigate: (page: Page) => void; products: Product[]; settings: Settings; add: (id: string) => void }) {
  const highlights = products.slice(0, 3)
  return <>
    <section className="container-page grid min-h-[590px] items-center gap-10 py-12 lg:grid-cols-[.91fr_1.09fr] lg:py-16">
      <div className="fade-in max-w-[520px]">
        <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#e8ded0] bg-[#fbf8f2] px-4 py-2 text-[11px] font-semibold text-[#806447]"><Sparkles size={13} /> YOUR NEIGHBOURHOOD COFFEE CORNER</div>
        <h1 className="serif text-[clamp(48px,6vw,76px)] font-medium leading-[1.07] tracking-[-.045em]">Good coffee.<br /><span className="italic text-[#8d6849]">Easy moments.</span></h1>
        <p className="mt-6 max-w-[410px] text-[15px] leading-7 text-[#75675b]">A cozy little corner in Karve Nagar for slow sips, familiar faces, and the kind of coffee break that feels like yours.</p>
        <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => onNavigate('menu')} className="rounded-full bg-[#47634d] px-6 py-4 text-[13px] font-bold text-white hover:bg-[#344c39]">Take a look at our menu <ArrowRight className="ml-2 inline" size={15} /></button><button onClick={() => onNavigate('contact')} className="rounded-full border border-[#d8cdbd] px-6 py-4 text-[13px] font-bold hover:bg-white">Come say hello</button></div>
        <div className="mt-9 flex items-center gap-3 text-[12px] text-[#77695d]">{settings.rating_verified ? <><span className="flex text-[#bb8951]" aria-label={`${settings.rating_reference} out of 5 stars`}><span aria-hidden>★★★★★</span></span><span>{settings.rating_reference} rating · {settings.review_count_reference} reviews <span className="text-[#b5aa9e]">·</span> Karve Nagar, Pune</span></> : <span>Karve Nagar, Pune <span className="text-[#b5aa9e]">·</span> coffee & good company</span>}</div>
      </div>
      <div className="relative mx-auto w-full max-w-[600px]">
        <div className="absolute -right-4 -top-3 z-10 grid h-[104px] w-[104px] rotate-6 place-items-center rounded-full bg-[#d8a66e] text-center text-[10px] font-bold uppercase leading-4 tracking-[.1em] text-[#3c291e] shadow-lg sm:-right-6 sm:-top-5"><span>Make room<br />for a little<br />me-time <Heart className="mx-auto mt-1" size={16} /></span></div>
        <div className="h-[380px] overflow-hidden rounded-[46%_46%_12px_12px] sm:h-[470px]"><img src={demoPhotos.hero} alt="Coffee being prepared at a cafe, illustrative stock photography" className="h-full w-full object-cover" /></div>
        <div className="absolute -bottom-5 -left-4 rounded-2xl border border-[#eee7dc] bg-[#fcfaf6] px-5 py-4 shadow-lg sm:-left-8"><span className="eyebrow block">Tucked away in</span><span className="serif mt-1 block text-lg">Karve Nagar, Pune</span></div>
      </div>
    </section>
    <div className="border-y border-[#eae3d8] bg-[#f1eee7]"><div className="container-page flex flex-wrap items-center justify-center gap-x-10 gap-y-3 py-5 text-[11px] font-semibold tracking-[.12em] text-[#7a695b] sm:justify-between"><span>MADE FOR SLOW MORNINGS</span><span className="text-[#b9a58d]">✳</span><span>GOOD THINGS, NO FUSS</span><span className="text-[#b9a58d]">✳</span><span>YOUR LOCAL COFFEE PAUSE</span></div></div>
    <section className="section-pad container-page">
      <SectionHeading eyebrow="A little something for everyone" title={<>Find your <i>happy place.</i></>} text="Browse our menu favourites. Final prices and availability are confirmed by the cafe before ordering is enabled." action="Browse full menu" onAction={() => onNavigate('menu')} />
      {highlights.length ? <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{highlights.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}</div>
        : <div className="mt-10 grid gap-5 sm:grid-cols-3">{[['Coffee, your way', demoPhotos.coffee], ['Something chilled', demoPhotos.pour], ['A bite between plans', demoPhotos.table]].map(([title, image]) => <div key={title} className="overflow-hidden rounded-2xl bg-white"><img className="h-[210px] w-full object-cover" src={image} alt={`${title}, illustrative cafe stock photography`} /><div className="p-5"><h3 className="serif text-xl">{title}</h3><p className="mt-2 text-xs leading-5 text-[#807266]">Menu details are being confirmed. Check back soon or visit us in Karve Nagar.</p></div></div>)}</div>}
      <p className="mt-5 text-center text-xs text-[#8a7c70]">Prices, recipes and availability are being confirmed by the cafe. <button className="underline" onClick={() => onNavigate('contact')}>Ask us in person.</button></p>
    </section>
    <section className="bg-[#3c2b21] text-[#fcf8f1]"><div className="container-page grid items-center gap-12 py-16 md:grid-cols-2 md:py-24">
      <div><span className="eyebrow text-[#d8ad7d]">Small cafe, big comfort</span><h2 className="serif mt-4 text-4xl leading-tight sm:text-5xl">The best plans<br />start with <i>a pause.</i></h2><p className="mt-5 max-w-md text-sm leading-7 text-[#d6c9bc]">We believe a neighborhood cafe should feel easy: warm cups, unhurried conversations, and a familiar spot to come back to.</p><button onClick={() => onNavigate('about')} className="mt-7 rounded-full border border-[#9b806a] px-5 py-3 text-xs font-bold hover:bg-white/10">A little about us <ArrowRight className="ml-2 inline" size={14} /></button></div>
      <div className="grid grid-cols-2 gap-4"><img src={demoPhotos.cafe} alt="Inviting cafe interior, illustrative stock photography" className="mt-10 h-56 w-full rounded-[46%_46%_12px_12px] object-cover" /><img src={demoPhotos.table} alt="Cafe table, illustrative stock photography" className="h-56 w-full rounded-2xl object-cover" /><span className="col-span-2 text-right text-[10px] text-[#bdab9a]">Illustrative stock photography — not photos of this cafe</span></div>
    </div></section>
    <section className="section-pad container-page">
      <SectionHeading eyebrow="A few snapshots" title={<>Take a little <i>look around.</i></>} text="Warm light, a good cup, and room to settle in." />
      <div className="mt-9 grid h-[380px] grid-cols-2 gap-3 sm:grid-cols-4"><img src={demoPhotos.pour} alt="Coffee cup, illustrative stock photography" className="h-full w-full rounded-2xl object-cover" /><img src={demoPhotos.table} alt="Cafe setting, illustrative stock photography" className="h-full w-full rounded-2xl object-cover" /><img src={demoPhotos.coffee} alt="Coffee, illustrative stock photography" className="hidden h-full w-full rounded-2xl object-cover sm:block" /><img src={demoPhotos.cafe} alt="Cafe interior, illustrative stock photography" className="hidden h-full w-full rounded-2xl object-cover sm:block" /></div>
      <p className="mt-3 text-right text-[10px] text-[#8a7c70]">Demo images are illustrative stock photography, not photos of TCC.</p>
    </section>
    <section className="bg-[#edece4]"><div className="container-page grid gap-8 py-14 md:grid-cols-[1fr_1.3fr] md:items-center">
      <div><span className="eyebrow">Come as you are</span><h2 className="serif mt-3 text-3xl">A good spot to<br /><i>make your own.</i></h2><button onClick={() => onNavigate('contact')} className="mt-5 text-sm font-bold text-[#49634c]">Find us in Karve Nagar <ArrowRight className="ml-2 inline" size={14} /></button></div>
      <div className="rounded-2xl bg-[#f9f7f2] p-7"><div className="flex items-center gap-2 text-sm font-bold"><Clock3 size={17} className="text-[#49634c]" /> Opening hours</div><p className="mt-3 text-sm text-[#7b6d60]">{settings.opening_hours}</p></div>
    </div></section>
    <div className="bg-[#d9e1d6]"><div className="container-page flex flex-col items-center justify-between gap-5 py-10 text-center sm:flex-row sm:text-left"><div><span className="eyebrow text-[#49634c]">A note from our corner</span><p className="serif mt-2 text-2xl">“Good coffee tastes even better with good company.”</p></div><button onClick={() => onNavigate('menu')} className="rounded-full bg-[#49634c] px-6 py-3 text-xs font-bold text-white">Find your next favourite <ArrowRight className="ml-2 inline" size={14} /></button></div></div>
  </>
}

function SectionHeading({ eyebrow, title, text, action, onAction }: { eyebrow: string; title: ReactNode; text?: string; action?: string; onAction?: () => void }) {
  return <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><span className="eyebrow">{eyebrow}</span><h2 className="serif mt-3 text-4xl leading-tight sm:text-[44px]">{title}</h2>{text && <p className="mt-3 max-w-xl text-sm leading-6 text-[#817366]">{text}</p>}</div>{action && <button onClick={onAction} className="shrink-0 text-sm font-bold text-[#49634c]">{action} <ArrowRight className="ml-2 inline" size={14} /></button>}</div>
}

function ProductCard({ product, onAdd }: { product: Product; onAdd: (id: string) => void }) {
  return <article className="group overflow-hidden rounded-2xl border border-[#ebe4d9] bg-[#fffefa] transition hover:-translate-y-1 hover:shadow-xl">
    <div className="relative h-[210px] overflow-hidden"><img src={menuPhoto(product)} alt={`Illustrative menu photo for ${product.name}`} loading="lazy" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /><span className="absolute bottom-3 left-3 rounded-full bg-[#3b2a20]/80 px-3 py-1 text-[9px] text-white">Illustrative image</span></div>
    <div className="p-5"><div className="flex items-start justify-between gap-3"><div><h3 className="serif text-xl">{product.name}</h3><p className="mt-2 line-clamp-2 text-xs leading-5 text-[#827467]">{product.description || 'A cafe favourite, made with care.'}</p></div>{product.price != null && <span className="whitespace-nowrap text-sm font-bold">₹{product.price}</span>}</div>
      <div className="mt-4 flex items-center justify-between"><div className="flex flex-wrap gap-1">{product.dietary_labels?.map((label) => <span key={label} className="rounded-full bg-[#edf1e9] px-2 py-1 text-[9px] text-[#49634c]">{label}</span>)}</div><button aria-label={`Add ${product.name} to bag`} onClick={() => onAdd(product.id)} disabled={product.price == null} className="grid h-9 w-9 place-items-center rounded-full bg-[#49634c] text-white transition hover:bg-[#344c39] disabled:cursor-not-allowed disabled:bg-[#c6c0b7]"><Plus size={16} /></button></div>
    </div>
  </article>
}

function MenuPage({ products, categories, add, error }: { products: Product[]; categories: Category[]; add: (id: string) => void; error: string }) {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState('all')
  const filtered = products.filter((product) => (active === 'all' || product.category_id === active) && `${product.name} ${product.description || ''} ${product.dietary_labels?.join(' ')}`.toLowerCase().includes(query.toLowerCase()))
  return <main className="container-page min-h-[65vh] py-12 sm:py-16">
    <span className="eyebrow">Made for your moment</span><h1 className="serif mt-3 text-5xl">The menu</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[#817366]">A little something for every kind of coffee break. Prices are from the cafe menu; the photos are illustrative and may differ from the drinks served.</p>
    <div className="mt-8 flex flex-col gap-4 border-y border-[#e8e1d6] py-5 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex flex-wrap gap-2">{[['all', 'Everything'], ...categories.map((cat) => [cat.id, cat.name])].map(([id, label]) => <button key={id} onClick={() => setActive(id)} className={`rounded-full px-4 py-2 text-xs font-semibold ${active === id ? 'bg-[#49634c] text-white' : 'border border-[#ded6ca] text-[#78695c] hover:bg-white'}`}>{label}</button>)}</div>
      <label className="flex items-center gap-2 rounded-full border border-[#ded6ca] bg-white px-4 py-2.5"><Search size={15} className="text-[#8c7b6b]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-full bg-transparent text-xs outline-none sm:w-40" placeholder="Search the menu" /></label>
    </div>
    {filtered.length ? <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{filtered.map((product) => <ProductCard key={product.id} product={product} onAdd={add} />)}</div>
      : <div className="py-24 text-center"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e9eee5] text-[#49634c]"><Coffee size={24} /></span><h2 className="serif mt-5 text-2xl">{error ? 'Menu temporarily unavailable' : query ? 'Nothing found just yet' : 'Our menu is brewing'}</h2><p className="mt-2 text-sm text-[#827467]">{error || (query ? 'Try another search, or clear your filters.' : 'The cafe is confirming its menu details. Check back soon or drop by.')}</p></div>}
    <p className="mt-8 text-center text-[11px] text-[#908274]">Menu photos are representative stock images, not photographs of the cafe’s actual servings.</p>
  </main>
}

function AboutPage() {
  return <main className="container-page section-pad min-h-[70vh]"><span className="eyebrow">A little about us</span><div className="mt-4 grid gap-10 lg:grid-cols-2 lg:items-center"><div><h1 className="serif text-5xl leading-tight sm:text-6xl">A neighborhood<br /><i>kind of coffee.</i></h1><p className="mt-7 text-sm leading-7 text-[#75675b]">The Caffeine Craft Cafe is a cozy neighborhood cafe in Karve Nagar, Pune. A friendly place to pause, catch up, and enjoy a cup at your own pace.</p><p className="mt-4 text-sm leading-7 text-[#75675b]">We’re building a space where everyday moments feel a little more special. Come by, say hello, and make yourself at home.</p><div className="mt-8 flex gap-3"><Leaf className="mt-1 shrink-0 text-[#547251]" size={18} /><p className="text-xs leading-6 text-[#827467]">Our menu and cafe details are being updated with the owner. We’ll share confirmed information here as it becomes available.</p></div></div><div className="relative"><img src={demoPhotos.cafe} alt="Warm cafe interior, illustrative stock photography and not a photo of TCC" className="h-[430px] w-full rounded-[48%_48%_16px_16px] object-cover" /><span className="absolute bottom-4 right-4 rounded-full bg-[#3b2a20]/80 px-3 py-2 text-[10px] text-white">Illustrative stock photography</span></div></div></main>
}

function ContactPage({ settings }: { settings: Settings }) {
  return <main className="container-page section-pad min-h-[70vh]"><span className="eyebrow">We’d love to see you</span><h1 className="serif mt-3 text-5xl">Find your way here.</h1><p className="mt-4 max-w-xl text-sm leading-6 text-[#817366]">Your neighborhood coffee corner, right here in Karve Nagar.</p>
    <div className="mt-10 grid gap-6 md:grid-cols-[1fr_1.1fr]"><div className="rounded-3xl bg-[#3c2b21] p-8 text-[#fcf8f1]"><h2 className="serif text-2xl">The Caffeine Craft Cafe</h2><div className="mt-7 flex gap-3"><MapPin className="mt-1 shrink-0 text-[#d5a974]" size={18} /><p className="text-sm leading-6 text-[#e0d4c8]">{settings.address}</p></div><div className="mt-5 flex gap-3"><Clock3 className="mt-1 shrink-0 text-[#d5a974]" size={18} /><p className="text-sm text-[#e0d4c8]">{settings.opening_hours}</p></div><p className="mt-2 pl-8 text-[11px] text-[#bdad9f]">Please confirm current hours before visiting.</p><a href="tel:+917774963125" className="mt-7 inline-block rounded-full bg-[#d5a974] px-5 py-3 text-xs font-bold text-[#39271c]">Call {settings.phone}</a></div>
      <div className="flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-[#e8e1d6] bg-[#eeece5] p-8 text-center"><MapPin size={29} className="text-[#49634c]" /><h2 className="serif mt-4 text-2xl">Prosperity Society, Karve Nagar</h2><p className="mt-2 max-w-sm text-xs leading-5 text-[#817366]">Near Vitthal Mandir Road, Ganesh Nagar, Pune, Maharashtra 411052</p><a target="_blank" rel="noreferrer" href={`https://maps.google.com/?q=${encodeURIComponent(settings.address)}`} className="mt-5 rounded-full border border-[#b7b0a3] bg-[#f8f6f1] px-5 py-3 text-xs font-bold">Open directions <ArrowUpRight className="ml-1 inline" size={14} /></a></div>
    </div>
    <div className="mt-8 grid gap-4 sm:grid-cols-2"><div className="rounded-2xl bg-white p-6"><h3 className="serif text-xl">Opening hours</h3><p className="mt-2 text-sm text-[#817366]">{settings.opening_hours}</p></div><div className="rounded-2xl bg-white p-6"><h3 className="serif text-xl">Frequently asked</h3><details className="mt-3 border-b border-[#eee8df] py-3"><summary className="flex cursor-pointer list-none items-center justify-between text-sm">Can I order online? <ChevronDown size={15} /></summary><p className="mt-2 text-xs leading-5 text-[#817366]">Online pickup is only available when enabled by the cafe. Please call us for current ordering options.</p></details><details className="py-3"><summary className="flex cursor-pointer list-none items-center justify-between text-sm">Are menu details confirmed? <ChevronDown size={15} /></summary><p className="mt-2 text-xs leading-5 text-[#817366]">Draft menu entries are not shown for ordering until the cafe confirms the prices, ingredients, and availability.</p></details></div></div>
  </main>
}

function TrackPage() {
  const [number, setNumber] = useState('')
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<{ order_number: string; status: string; created_at: string } | null>(null)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setResult(null); setBusy(true)
    try {
      const order = await fetchOrder(number, phone)
      if (order) setResult(order)
      else setError('No order matched that reference and phone number.')
    }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'We could not look up your order.') }
    finally { setBusy(false) }
  }
  return <main className="container-page min-h-[65vh] py-16"><div className="mx-auto max-w-xl rounded-3xl border border-[#e9e2d7] bg-white p-7 sm:p-10"><span className="eyebrow">Your order</span><h1 className="serif mt-3 text-4xl">Track an order</h1><p className="mt-3 text-sm leading-6 text-[#817366]">Enter your order number and the phone number used at checkout.</p>
    <form onSubmit={submit} className="mt-7 grid gap-4"><Field label="Order number" value={number} onChange={setNumber} placeholder="TCC-YYMMDD-000001" required /><Field label="Phone number" value={phone} onChange={setPhone} placeholder="10-digit mobile number" required /><button disabled={busy} className="mt-1 rounded-full bg-[#49634c] px-5 py-3.5 text-sm font-bold text-white disabled:opacity-60">{busy ? 'Checking…' : 'Check order status'}</button></form>
    {error && <p role="status" className="mt-4 rounded-xl bg-[#faf0e7] p-3 text-sm text-[#805239]">{error}</p>}{result && <div className="mt-5 rounded-xl bg-[#edf1e9] p-4"><p className="text-xs text-[#687d65]">Order {result.order_number}</p><p className="mt-1 capitalize font-bold">{result.status.replaceAll('_', ' ')}</p></div>}
  </div></main>
}

function Field({ label, value, onChange, placeholder, type = 'text', required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="grid gap-2 text-xs font-semibold text-[#5d4c3f]">{label}<input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="rounded-xl border border-[#e3dbcf] bg-[#fffefa] px-4 py-3 text-sm outline-none transition focus:border-[#789078] focus:ring-2 focus:ring-[#dfe8dc]" /></label>
}

function CartDrawer({ items, products, settings, onClose, onChange, onClear, onOrder, onNotice }: {
  items: CartLine[]; products: Map<string, Product>; settings: Settings; onClose: () => void
  onChange: (id: string, delta: number) => void; onClear: () => void
  onOrder: (order: { order_number: string; total: number }) => void; onNotice: (notice: string) => void
}) {
  const [details, setDetails] = useState<{ name: string; phone: string; email: string; notes: string; fulfillment: 'pickup' | 'delivery'; deliveryAddress: string; promotionCode: string }>({
    name: '', phone: '', email: '', notes: '', fulfillment: settings.pickup_enabled ? 'pickup' : 'delivery', deliveryAddress: '', promotionCode: '',
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const rows = items.map((line) => ({ line, product: products.get(line.productId) })).filter((row): row is { line: CartLine; product: Product } => !!row.product)
  const subtotal = rows.reduce((sum, row) => sum + (row.product.price || 0) * row.line.quantity, 0)
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (details.fulfillment === 'pickup' && !settings.pickup_enabled) { setError('Online pickup is not enabled yet. Please call the cafe to order.'); return }
    if (details.fulfillment === 'delivery' && !settings.delivery_enabled) { setError('Delivery is not enabled yet. Please call the cafe to order.'); return }
    setBusy(true)
    try { const result = await createOrder(details, items); onOrder(result) }
    catch (issue) { setError(issue instanceof Error ? issue.message : 'We could not place your order. Please try again.') }
    finally { setBusy(false) }
  }
  return <div className="fixed inset-0 z-[60] flex justify-end bg-[#241910]/40" onClick={onClose}>
    <aside role="dialog" aria-modal="true" aria-label="Your shopping bag" onClick={(event) => event.stopPropagation()} className="flex h-full w-full max-w-[470px] flex-col bg-[#faf8f3] shadow-2xl">
      <div className="flex items-center justify-between border-b border-[#e7dfd3] p-6"><div><span className="eyebrow">Just a few good things</span><h2 className="serif mt-1 text-2xl">Your bag <span className="text-base text-[#918273]">({items.reduce((s, x) => s + x.quantity, 0)})</span></h2></div><button onClick={onClose} aria-label="Close bag" className="grid h-10 w-10 place-items-center rounded-full border border-[#e0d8cb]"><X size={18} /></button></div>
      {!rows.length ? <div className="grid flex-1 place-content-center justify-items-center text-center"><ShoppingBag className="text-[#8b9a84]" size={30} /><p className="serif mt-4 text-xl">Your bag is taking a little pause.</p><p className="mt-2 text-xs text-[#817366]">Add a menu item and it’ll be waiting here.</p></div> : <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-4">{rows.map(({ line, product }) => <div key={product.id} className="flex gap-4 rounded-2xl border border-[#ebe4d9] bg-white p-4"><img src={product.photo_url || demoPhotos.coffee} alt="" className="h-16 w-16 rounded-xl object-cover" /><div className="min-w-0 flex-1"><h3 className="serif">{product.name}</h3><p className="mt-1 text-xs text-[#817366]">₹{product.price} each</p><div className="mt-2 inline-flex items-center gap-3 rounded-full border border-[#e6dfd3] px-2 py-1"><button type="button" aria-label={`Decrease ${product.name} quantity`} onClick={() => onChange(product.id, -1)}><Minus size={13} /></button><span className="text-xs">{line.quantity}</span><button type="button" aria-label={`Increase ${product.name} quantity`} onClick={() => onChange(product.id, 1)}><Plus size={13} /></button></div></div><span className="text-sm font-bold">₹{(product.price || 0) * line.quantity}</span></div>)}</div>
          <div className="my-5 border-t border-[#e7dfd3] pt-4"><div className="flex justify-between text-sm"><span>Subtotal</span><b>₹{subtotal}</b></div><p className="mt-2 text-[10px] leading-4 text-[#8c7d70]">Taxes or fees, if applicable, are calculated by the cafe at checkout.</p></div>
          <h3 className="serif mb-4 text-xl">How would you like it?</h3>
          <div className="mb-4 flex flex-wrap gap-2">
            {settings.pickup_enabled && <button type="button" onClick={() => setDetails({ ...details, fulfillment: 'pickup' })} className={`rounded-full px-4 py-2 text-xs font-bold ${details.fulfillment === 'pickup' ? 'bg-[#49634c] text-white' : 'border border-[#ddd4c7]'}`}>Pickup</button>}
            {settings.delivery_enabled && <button type="button" onClick={() => setDetails({ ...details, fulfillment: 'delivery' })} className={`rounded-full px-4 py-2 text-xs font-bold ${details.fulfillment === 'delivery' ? 'bg-[#49634c] text-white' : 'border border-[#ddd4c7]'}`}>Delivery</button>}
            {!settings.pickup_enabled && !settings.delivery_enabled && <div className="rounded-xl bg-[#f4ebe0] p-3 text-xs leading-5 text-[#805239]">Online ordering is not enabled yet. Your order won’t be submitted. Please call the cafe directly.</div>}
          </div>
          <div className="grid gap-3"><Field label="Your name" value={details.name} onChange={(name) => setDetails({ ...details, name })} required /><Field label="Mobile number" value={details.phone} onChange={(phone) => setDetails({ ...details, phone })} type="tel" placeholder="10-digit mobile number" required /><Field label="Email (optional)" value={details.email} onChange={(email) => setDetails({ ...details, email })} type="email" />
            {details.fulfillment === 'delivery' && settings.delivery_enabled && <label className="grid gap-2 text-xs font-semibold text-[#5d4c3f]">Delivery address<textarea required value={details.deliveryAddress} onChange={(event) => setDetails({ ...details, deliveryAddress: event.target.value })} className="min-h-20 rounded-xl border border-[#e3dbcf] bg-white px-4 py-3 text-sm" /></label>}
            {settings.promotion_code && settings.promotion_percent > 0 && <Field label={settings.promotion_description || 'Promotion code (optional)'} value={details.promotionCode} onChange={(promotionCode) => setDetails({ ...details, promotionCode })} />}
            <label className="grid gap-2 text-xs font-semibold text-[#5d4c3f]">Order notes (optional)<textarea maxLength={500} value={details.notes} onChange={(event) => setDetails({ ...details, notes: event.target.value })} className="min-h-20 resize-y rounded-xl border border-[#e3dbcf] bg-white px-4 py-3 text-sm outline-none focus:border-[#789078]" /></label></div>
          {error && <p role="alert" className="mt-3 rounded-xl bg-[#faf0e7] p-3 text-xs text-[#805239]">{error}</p>}
        </div>
        <div className="border-t border-[#e7dfd3] bg-white px-6 py-5"><button disabled={busy || !rows.length || rows.some((row) => row.product.price == null) || (!settings.pickup_enabled && !settings.delivery_enabled)} className="w-full rounded-full bg-[#49634c] px-5 py-4 text-sm font-bold text-white disabled:cursor-not-allowed disabled:bg-[#b8b5ac]">{busy ? 'Placing your order…' : `Place ${details.fulfillment} order · subtotal ₹${subtotal}`}</button><p className="mt-2 text-center text-[10px] text-[#8c7d70]">Taxes, configured fees and any valid promotion are calculated by the cafe. No online payment is collected.</p><button type="button" onClick={() => { onClear(); onNotice('Your bag is empty') }} className="mx-auto mt-3 block text-[11px] text-[#8c7d70] underline">Clear bag</button></div>
      </form>}
    </aside>
  </div>
}

function Confirmation({ order, onClose }: { order: { order_number: string; total: number }; onClose: () => void }) {
  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#241910]/50 p-4"><div role="dialog" aria-modal="true" className="w-full max-w-md rounded-3xl bg-[#faf8f3] p-8 text-center shadow-2xl"><span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e0eadc] text-[#49634c]"><Check size={26} /></span><span className="eyebrow mt-5 block">Order received</span><h2 className="serif mt-2 text-3xl">Thanks for stopping by.</h2><p className="mt-3 text-sm leading-6 text-[#817366]">Your order request is saved. The cafe will confirm it with you directly before preparing.</p><div className="my-5 rounded-xl bg-white p-4"><p className="text-[10px] uppercase tracking-wider text-[#8b7a68]">Order reference</p><p className="mt-1 font-bold">{order.order_number}</p><p className="mt-2 text-xs text-[#817366]">Server-calculated total: ₹{order.total}</p></div><p className="mb-5 text-xs text-[#817366]">No payment has been taken.</p><button onClick={onClose} className="w-full rounded-full bg-[#49634c] px-5 py-3 text-sm font-bold text-white">Done</button></div></div>
}

function AdminPage({ session, allowed, products, categories, settings, onRefresh, onSettings, onNotice }: {
  session: Session | null; allowed: boolean; products: Product[]; categories: Category[]; settings: Settings
  onRefresh: () => Promise<void>; onSettings: (settings: Settings) => void; onNotice: (notice: string) => void
}) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [orders, setOrders] = useState<OrderWithItems[]>([])
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState<'orders' | 'menu' | 'settings'>('orders')
  const [newProduct, setNewProduct] = useState({ name: '', price: '', category_id: '', description: '', photo_url: '' })
  const [productEdits, setProductEdits] = useState<Record<string, { price: string; description: string; photo_url: string; category_id: string }>>({})
  const [categoryEdits, setCategoryEdits] = useState<Record<string, string>>({})
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [categoryName, setCategoryName] = useState('')
  const [adminError, setAdminError] = useState('')
  useEffect(() => { if (allowed && supabase) void supabase.from('orders').select('id,order_number,customer_name,customer_phone,fulfillment,delivery_address,status,total,created_at,order_items(product_name,unit_price,quantity,line_total)').order('created_at', { ascending: false }).limit(30).then(({ data, error }) => { if (error) setAdminError(error.message); else if (data) setOrders(data as OrderWithItems[]) }) }, [allowed])
  async function login(event: FormEvent) {
    event.preventDefault(); setAdminError('')
    if (!supabase) { setAdminError('Connect Supabase before signing in.'); return }
    setBusy(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setAdminError(error.message)
    setBusy(false)
  }
  async function addProduct(event: FormEvent) {
    event.preventDefault(); setAdminError('')
    if (!supabase) return
    const price = Number(newProduct.price)
    if (!newProduct.name.trim() || !Number.isFinite(price) || price < 0 || price > 100000 || !newProduct.category_id) { setAdminError('Enter a product name, valid price and category.'); return }
    let photoUrl = newProduct.photo_url.trim() || null
    if (photoFile) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(photoFile.type) || photoFile.size > 5 * 1024 * 1024) {
        setAdminError('Choose a JPG, PNG, or WebP image smaller than 5 MB.')
        return
      }
      const extension = photoFile.type === 'image/jpeg' ? 'jpg' : photoFile.type.split('/')[1]
      const path = `${crypto.randomUUID()}.${extension}`
      const { error: uploadError } = await supabase.storage.from('product-photos').upload(path, photoFile, { contentType: photoFile.type, upsert: false })
      if (uploadError) { setAdminError(uploadError.message); return }
      photoUrl = supabase.storage.from('product-photos').getPublicUrl(path).data.publicUrl
    }
    const { error } = await supabase.from('products').insert({ name: newProduct.name.trim(), price, category_id: newProduct.category_id, description: newProduct.description || null, photo_url: photoUrl, status: 'draft', is_published: false, is_available: false })
    if (error) setAdminError(error.message)
    else { setNewProduct({ name: '', price: '', category_id: '', description: '', photo_url: '' }); setPhotoFile(null); onNotice('Draft product saved'); await onRefresh() }
  }
  async function addCategory(event: FormEvent) {
    event.preventDefault(); if (!supabase || !categoryName.trim()) return
    const { error } = await supabase.from('categories').insert({ name: categoryName.trim(), is_active: true, sort_order: categories.length + 1 })
    if (error) setAdminError(error.message); else { setCategoryName(''); await onRefresh() }
  }
  async function saveCategory(category: Category) {
    if (!supabase) return
    const name = (categoryEdits[category.id] || category.name).trim()
    if (!name) { setAdminError('Category names cannot be empty.'); return }
    const { error } = await supabase.from('categories').update({ name }).eq('id', category.id)
    if (error) setAdminError(error.message)
    else { setCategoryEdits((current) => ({ ...current, [category.id]: name })); onNotice('Category updated'); await onRefresh() }
  }
  async function updateOrder(id: string, status: string) {
    if (!supabase) return
    const { error } = await supabase.from('orders').update({ status }).eq('id', id)
    if (error) setAdminError(error.message); else setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order))
  }
  async function toggleProduct(product: Product, key: 'is_published' | 'is_available', value: boolean) {
    if (!supabase) return
    const update = key === 'is_published'
      ? { is_published: value, status: value ? 'published' : 'draft' }
      : { is_available: value }
    const { error } = await supabase.from('products').update(update).eq('id', product.id)
    if (error) setAdminError(error.message); else await onRefresh()
  }
  async function saveProduct(product: Product) {
    if (!supabase) return
    const edit = productEdits[product.id] || { price: String(product.price ?? ''), description: product.description || '', photo_url: product.photo_url || '', category_id: product.category_id || '' }
    const price = edit.price === '' ? null : Number(edit.price)
    if (price !== null && (!Number.isFinite(price) || price < 0 || price > 100000)) { setAdminError('Enter a valid INR price.'); return }
    const { error } = await supabase.from('products').update({
      price, description: edit.description.trim() || null, photo_url: edit.photo_url.trim() || null,
    category_id: edit.category_id,
    }).eq('id', product.id)
    if (error) setAdminError(error.message); else { onNotice('Product details saved'); await onRefresh() }
  }
  async function saveSettings(event: FormEvent) {
    event.preventDefault(); if (!supabase) return
    const { error } = await supabase.from('business_settings').update({
      business_name: settings.business_name, address: settings.address, phone: settings.phone,
      opening_hours: settings.opening_hours, pickup_enabled: settings.pickup_enabled,
      delivery_enabled: settings.delivery_enabled, delivery_fee: Number(settings.delivery_fee), tax_rate: Number(settings.tax_rate),
      promotion_code: settings.promotion_code?.trim() || null,
      promotion_description: settings.promotion_description?.trim() || null,
      promotion_percent: Number(settings.promotion_percent),
      rating_reference: Number(settings.rating_reference),
      review_count_reference: Number(settings.review_count_reference),
      rating_verified: settings.rating_verified,
    }).eq('id', 1)
    if (error) setAdminError(error.message); else { onNotice('Business settings saved'); await onRefresh() }
  }
  if (!session || !allowed) return <main className="container-page min-h-[68vh] py-16"><div className="mx-auto max-w-md rounded-3xl border border-[#e9e2d7] bg-white p-8"><span className="eyebrow">Staff access</span><h1 className="serif mt-3 text-4xl">Cafe dashboard</h1><p className="mt-3 text-sm leading-6 text-[#817366]">Sign in with an authorized staff account. Admin access is granted by the cafe owner in Supabase.</p><form onSubmit={login} className="mt-7 grid gap-4"><Field label="Email" value={email} onChange={setEmail} type="email" required /><Field label="Password" value={password} onChange={setPassword} type="password" required /><button disabled={busy} className="rounded-full bg-[#49634c] px-5 py-3.5 text-sm font-bold text-white">{busy ? 'Signing in…' : 'Sign in'}</button></form>{adminError && <p role="alert" className="mt-4 text-sm text-[#9a5339]">{adminError}</p>}{session && <p className="mt-4 text-xs text-[#817366]">This account is authenticated but does not have the admin role.</p>}</div></main>
  return <main className="container-page min-h-[70vh] py-10 sm:py-14">
    <div className="flex flex-wrap items-center justify-between gap-4"><div><span className="eyebrow">Staff only</span><h1 className="serif mt-2 text-4xl">Cafe dashboard</h1></div><button onClick={() => supabase?.auth.signOut()} className="rounded-full border border-[#ddd4c7] px-4 py-2 text-xs font-bold">Sign out</button></div>
    {adminError && <p role="alert" className="mt-4 rounded-xl bg-[#faf0e7] p-3 text-sm text-[#805239]">{adminError}</p>}
    <div className="mt-7 grid gap-3 sm:grid-cols-3"><SummaryCard label="Published menu items" value={String(products.filter((item) => item.is_published).length)} /><SummaryCard label="Incoming orders" value={String(orders.filter((order) => !['completed', 'cancelled'].includes(order.status)).length)} /><SummaryCard label="Order history" value={String(orders.length)} /></div>
    <div className="mt-8 flex gap-2 overflow-auto border-b border-[#e7dfd3]">{([['orders', 'Orders'], ['menu', 'Menu & categories'], ['settings', 'Business settings']] as const).map(([id, label]) => <button key={id} onClick={() => setTab(id)} className={`shrink-0 border-b-2 px-4 py-3 text-sm font-semibold ${tab === id ? 'border-[#49634c] text-[#49634c]' : 'border-transparent text-[#807266]'}`}>{label}</button>)}</div>
    {tab === 'orders' && <div className="mt-6 overflow-hidden rounded-2xl border border-[#e9e2d7] bg-white"><div className="border-b border-[#eee7dd] p-5"><h2 className="serif text-2xl">Recent orders</h2></div>{orders.length ? <div className="divide-y divide-[#eee7dd]">{orders.map((order) => <div key={order.id} className="flex flex-col justify-between gap-4 p-5 md:flex-row md:items-center"><div><p className="font-bold">{order.order_number} <span className="ml-2 text-xs font-normal capitalize text-[#817366]">{order.status.replaceAll('_', ' ')}</span></p><p className="mt-1 text-xs text-[#817366]">{order.customer_name} · {order.customer_phone} · {order.fulfillment}</p>{order.delivery_address && <p className="mt-1 max-w-lg text-xs text-[#817366]">{order.delivery_address}</p>}<p className="mt-1 text-[10px] text-[#9a8c7e]">{new Date(order.created_at).toLocaleString()}</p><div className="mt-2 text-[11px] text-[#6f6256]">{order.order_items?.map((item) => `${item.quantity} × ${item.product_name} · ₹${item.line_total}`).join('  ·  ')}</div></div><div className="flex items-center gap-3"><b className="text-sm">₹{order.total}</b><select aria-label={`Update order ${order.order_number} status`} value={order.status} onChange={(event) => void updateOrder(order.id, event.target.value)} className="rounded-lg border border-[#ded6ca] bg-white px-3 py-2 text-xs"><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="preparing">Preparing</option><option value="ready">Ready</option>{order.fulfillment === 'delivery' && <option value="out_for_delivery">Out for delivery</option>}<option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div></div>)}</div> : <p className="p-8 text-center text-sm text-[#817366]">No orders yet. New pickup requests will show here.</p>}</div>}
    {tab === 'menu' && <div className="mt-6 grid gap-6 lg:grid-cols-[.8fr_1.2fr]">
      <section className="rounded-2xl border border-[#e9e2d7] bg-white p-5"><h2 className="serif text-2xl">Add a draft item</h2><p className="mt-1 text-xs text-[#817366]">New products remain unpublished until you confirm details.</p><form onSubmit={addProduct} className="mt-5 grid gap-3"><Field label="Item name" value={newProduct.name} onChange={(name) => setNewProduct({ ...newProduct, name })} required /><Field label="Price (INR)" value={newProduct.price} onChange={(price) => setNewProduct({ ...newProduct, price })} type="number" required /><label className="grid gap-2 text-xs font-semibold text-[#5d4c3f]">Category<select value={newProduct.category_id} onChange={(event) => setNewProduct({ ...newProduct, category_id: event.target.value })} required className="rounded-xl border border-[#e3dbcf] bg-white px-4 py-3 text-sm"><option value="">Choose category</option>{categories.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label><label className="grid gap-2 text-xs font-semibold text-[#5d4c3f]">Description<textarea value={newProduct.description} onChange={(event) => setNewProduct({ ...newProduct, description: event.target.value })} className="min-h-20 rounded-xl border border-[#e3dbcf] px-4 py-3 text-sm" /></label><Field label="Photo URL (optional)" value={newProduct.photo_url} onChange={(photo_url) => setNewProduct({ ...newProduct, photo_url })} placeholder="https://…" /><label className="grid gap-2 text-xs font-semibold text-[#5d4c3f]">Or upload photo (JPG, PNG, WebP; max 5 MB)<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setPhotoFile(event.target.files?.[0] || null)} className="text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[#edf1e9] file:px-4 file:py-2 file:text-xs" /></label><button className="rounded-full bg-[#49634c] px-4 py-3 text-sm font-bold text-white">Save as draft</button></form>
      <form onSubmit={addCategory} className="mt-6 flex gap-2 border-t border-[#eee7dd] pt-5"><input value={categoryName} onChange={(event) => setCategoryName(event.target.value)} placeholder="New category name" className="min-w-0 flex-1 rounded-xl border border-[#e3dbcf] px-4 py-3 text-sm" /><button className="rounded-full border border-[#49634c] px-4 text-xs font-bold text-[#49634c]">Add category</button></form>
      <div className="mt-4 space-y-2">{categories.map((category) => <div key={category.id} className="flex gap-2"><input aria-label={`Category name ${category.name}`} value={categoryEdits[category.id] ?? category.name} onChange={(event) => setCategoryEdits({ ...categoryEdits, [category.id]: event.target.value })} className="min-w-0 flex-1 rounded-xl border border-[#e3dbcf] px-3 py-2 text-xs" /><button type="button" onClick={() => void saveCategory(category)} className="rounded-full border border-[#49634c] px-3 text-[10px] font-bold text-[#49634c]">Save</button></div>)}</div>
    </section>
    <section className="rounded-2xl border border-[#e9e2d7] bg-white p-5"><h2 className="serif text-2xl">Menu items</h2><div className="mt-4 divide-y divide-[#eee7dd]">{products.length ? products.map((product) => { const edit = productEdits[product.id] || { price: String(product.price ?? ''), description: product.description || '', photo_url: product.photo_url || '', category_id: product.category_id || '' }; return <div key={product.id} className="py-4"><div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-sm font-bold">{product.name} <span className="ml-2 rounded-full bg-[#f3eee6] px-2 py-1 text-[9px] font-medium text-[#847360]">{product.is_published ? 'Published' : 'Draft'}</span></p><p className="mt-1 text-xs text-[#817366]">{categories.find((category) => category.id === product.category_id)?.name || 'No category'}</p></div><div className="flex gap-3 text-[11px]"><label className="flex items-center gap-1"><input type="checkbox" checked={product.is_available} onChange={(event) => void toggleProduct(product, 'is_available', event.target.checked)} />Available</label><label className="flex items-center gap-1"><input type="checkbox" checked={product.is_published} onChange={(event) => void toggleProduct(product, 'is_published', event.target.checked)} />Publish</label></div></div><div className="mt-3 grid gap-2 sm:grid-cols-2"><Field label="Price (INR)" value={edit.price} onChange={(price) => setProductEdits({ ...productEdits, [product.id]: { ...edit, price } })} type="number" /><Field label="Photo URL" value={edit.photo_url} onChange={(photo_url) => setProductEdits({ ...productEdits, [product.id]: { ...edit, photo_url } })} /><label className="grid gap-2 text-xs font-semibold text-[#5d4c3f] sm:col-span-2">Description<textarea value={edit.description} onChange={(event) => setProductEdits({ ...productEdits, [product.id]: { ...edit, description: event.target.value } })} className="min-h-14 rounded-xl border border-[#e3dbcf] px-4 py-3 text-sm" /></label><button onClick={() => void saveProduct(product)} className="rounded-full border border-[#49634c] px-4 py-2 text-xs font-bold text-[#49634c] sm:col-span-2">Save item details</button></div></div>}) : <p className="py-8 text-center text-sm text-[#817366]">No products. Seed entries appear after setup.</p>}</div></section>
    </div>}
    {tab === 'settings' && <form onSubmit={saveSettings} className="mt-6 grid gap-5 rounded-2xl border border-[#e9e2d7] bg-white p-6 md:grid-cols-2"><Field label="Business name" value={settings.business_name} onChange={(business_name) => onSettings({ ...settings, business_name })} /><Field label="Phone" value={settings.phone} onChange={(phone) => onSettings({ ...settings, phone })} /><label className="grid gap-2 text-xs font-semibold md:col-span-2">Address<textarea value={settings.address} onChange={(event) => onSettings({ ...settings, address: event.target.value })} className="min-h-20 rounded-xl border border-[#e3dbcf] px-4 py-3 text-sm" /></label><Field label="Opening hours" value={settings.opening_hours} onChange={(opening_hours) => onSettings({ ...settings, opening_hours })} /><Field label="Tax rate (%)" value={String(settings.tax_rate)} onChange={(tax_rate) => onSettings({ ...settings, tax_rate: Number(tax_rate) })} type="number" /><Field label="Delivery fee (INR)" value={String(settings.delivery_fee)} onChange={(delivery_fee) => onSettings({ ...settings, delivery_fee: Number(delivery_fee) })} type="number" /><div className="flex flex-wrap items-center gap-5 text-xs"><label className="flex items-center gap-2"><input type="checkbox" checked={settings.pickup_enabled} onChange={(event) => onSettings({ ...settings, pickup_enabled: event.target.checked })} />Enable pickup orders</label><label className="flex items-center gap-2"><input type="checkbox" checked={settings.delivery_enabled} onChange={(event) => onSettings({ ...settings, delivery_enabled: event.target.checked })} />Enable delivery</label></div><div className="rounded-xl bg-[#f6f3ed] p-4 md:col-span-2"><h3 className="serif text-lg">Optional promotion</h3><p className="mb-3 mt-1 text-[11px] text-[#817366]">Discount applies to item subtotal only when the customer enters this exact code.</p><div className="grid gap-3 sm:grid-cols-3"><Field label="Promo code" value={settings.promotion_code || ''} onChange={(promotion_code) => onSettings({ ...settings, promotion_code })} /><Field label="Description" value={settings.promotion_description || ''} onChange={(promotion_description) => onSettings({ ...settings, promotion_description })} /><Field label="Discount (%)" value={String(settings.promotion_percent)} onChange={(promotion_percent) => onSettings({ ...settings, promotion_percent: Number(promotion_percent) })} type="number" /></div></div><button className="rounded-full bg-[#49634c] px-5 py-3 text-sm font-bold text-white md:col-span-2">Save settings</button><p className="text-[11px] leading-5 text-[#8c7d70] md:col-span-2">Only enable pickup or delivery after the cafe has confirmed operations and fulfilment details. Online payments and third-party ordering integrations are not configured.</p></form>}
    {tab === 'settings' && <RatingReferenceEditor settings={settings} onSettings={onSettings} onNotice={onNotice} />}
  </main>
}

function RatingReferenceEditor({ settings, onSettings, onNotice }: { settings: Settings; onSettings: (settings: Settings) => void; onNotice: (notice: string) => void }) {
  async function save() {
    if (!supabase) return
    const { error } = await supabase.from('business_settings').update({
      rating_reference: Number(settings.rating_reference),
      review_count_reference: Number(settings.review_count_reference),
      rating_verified: settings.rating_verified,
    }).eq('id', 1)
    if (error) onNotice(`Could not save rating references: ${error.message}`)
    else onNotice('Rating references saved')
  }
  return <section className="mt-4 rounded-2xl border border-[#e9e2d7] bg-white p-6">
    <h3 className="serif text-xl">Rating reference (not verified)</h3>
    <p className="mt-1 text-xs leading-5 text-[#817366]">Reference values are hidden from customers until you verify them. Check the source before enabling display.</p>
    <div className="mt-4 grid gap-4 sm:grid-cols-3">
      <Field label="Rating reference (0–5)" value={String(settings.rating_reference)} onChange={(rating_reference) => onSettings({ ...settings, rating_reference: Number(rating_reference) })} type="number" />
      <Field label="Review count reference" value={String(settings.review_count_reference)} onChange={(review_count_reference) => onSettings({ ...settings, review_count_reference: Number(review_count_reference) })} type="number" />
      <label className="flex items-center gap-2 self-end pb-3 text-xs"><input type="checkbox" checked={settings.rating_verified} onChange={(event) => onSettings({ ...settings, rating_verified: event.target.checked })} />Owner verified for display</label>
      <button type="button" onClick={() => void save()} className="rounded-full border border-[#49634c] px-4 py-2 text-xs font-bold text-[#49634c] sm:col-span-3">Save rating reference</button>
    </div>
  </section>
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-[#e9e2d7] bg-white p-5"><span className="text-xs text-[#817366]">{label}</span><b className="serif mt-2 block text-3xl">{value}</b></div>
}

function Footer({ onNavigate, settings }: { onNavigate: (page: Page) => void; settings: Settings }) {
  return <footer className="bg-[#302219] text-[#f8f3eb]"><div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
    <div><div className="flex items-center gap-3"><img src="/images/brand/caffeine-craft-emblem.jpg" alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /><span><span className="serif block text-lg">The Caffeine Craft</span><span className="text-[9px] tracking-[.18em] text-[#c5b4a2]">CAFE · KARVE NAGAR</span></span></div><p className="mt-4 max-w-xs text-xs leading-6 text-[#c8bbae]">A cozy little corner for coffee, good company, and easy moments.</p></div>
    <div><h2 className="text-xs font-bold uppercase tracking-wider text-[#d4a977]">Explore</h2><div className="mt-4 grid gap-3 text-xs text-[#d2c7bb]"><button onClick={() => onNavigate('menu')} className="text-left">Our menu</button><button onClick={() => onNavigate('about')} className="text-left">Our story</button><button onClick={() => onNavigate('contact')} className="text-left">Visit us</button></div></div>
    <div><h2 className="text-xs font-bold uppercase tracking-wider text-[#d4a977]">Find us</h2><p className="mt-4 text-xs leading-6 text-[#d2c7bb]">{settings.address}</p></div>
    <div><h2 className="text-xs font-bold uppercase tracking-wider text-[#d4a977]">Come on over</h2><p className="mt-4 text-xs text-[#d2c7bb]">{settings.opening_hours}</p><a href={`tel:${settings.phone.replace(/[^\d+]/g, '')}`} className="mt-3 inline-block text-xs font-bold">{settings.phone}</a></div>
  </div><div className="border-t border-white/10"><div className="container-page flex flex-col justify-between gap-2 py-4 text-[10px] text-[#ad9f92] sm:flex-row"><span>© {new Date().getFullYear()} The Caffeine Craft Cafe · TCC Karve Nagar</span><span>Made with a little extra care in Pune</span></div></div></footer>
}

export default App
