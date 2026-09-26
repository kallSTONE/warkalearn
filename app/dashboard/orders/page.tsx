"use client"

import { useEffect, useMemo, useState } from "react"
import TransitionLink from "@/components/transition-link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSupabase } from "@/components/providers/supabase-provider"
import { useLanguage } from "@/components/providers/language-provider"
import { translate } from "@/lib/i18n"
import { ShoppingBag, ShoppingCart, CreditCard, Calendar, BookOpen, Receipt } from "lucide-react"
import { useRouter } from "next/navigation"
import { formatEthiopianBirr } from "@/lib/shop"
import { CartSheet } from "@/components/shop/cart-sheet"
import { CheckoutModal } from "@/components/shop/checkout-modal"
import { useShopCart } from "@/hooks/useShopCart"
import { useToast } from "@/hooks/use-toast"

type PaidEnrollment = {
    enrollment_id: string
    enrolled_at: string
    amount_paid?: number
    course: {
        id: string
        title: string
        slug: string | null
        hero_image: string | null
        image_url?: string | null
        price: number | null
        is_paid: boolean | null
    }
}

type ShopPurchaseOrder = {
    id: string
    created_at: string
    total_amount: number
    status: string
    payment_method: string
    items: Array<{
        id: string
        quantity: number
        line_total: number
        product_name: string
        slug: string | null
    }>
}

export default function OrdersPage() {
    const router = useRouter()
    const { user, loading, supabase } = useSupabase()
    const { locale } = useLanguage()
    const { toast } = useToast()
    const t = (key: string, fallback?: string) => translate(locale, key, fallback)
    const [items, setItems] = useState<PaidEnrollment[]>([])
    const [shopOrders, setShopOrders] = useState<ShopPurchaseOrder[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [cartOpen, setCartOpen] = useState(false)
    const [checkoutOpen, setCheckoutOpen] = useState(false)
    const [checkingOut, setCheckingOut] = useState(false)

    const {
        items: cartItems,
        totals,
        loading: cartLoading,
        updateQuantity,
        removeItem,
        checkout,
    } = useShopCart({
        supabase,
        userId: user?.id,
    })

    useEffect(() => {
        if (!loading && (!user || user.user_metadata?.role !== "lawyer")) {
            router.replace("/login")
        }
    }, [loading, user, router])

    useEffect(() => {
        if (!user) return

        const loadOrders = async () => {
            setIsLoading(true)
            const { data: courseData, error: courseError } = await supabase
                .from("course_enrollments")
                .select(
                    `
                    id,
                    enrolled_at,
                    amount_paid,
                    courses (
                        id,
                        title,
                        slug,
                        hero_image,
                        image_url,
                        price,
                        is_paid
                    )
                `
                )
                .eq("user_id", user.id)
                .order("enrolled_at", { ascending: false })

            const { data: shopData, error: shopError } = await supabase
                .from("shop_orders")
                .select(
                    `
                    id,
                    created_at,
                    total_amount,
                    status,
                    payment_method,
                    shop_order_items (
                        id,
                        quantity,
                        line_total,
                        product_name,
                        shop_products (
                            slug
                        )
                    )
                `
                )
                .eq("user_id", user.id)
                .order("created_at", { ascending: false })

            if (courseError) {
                console.error("Error loading course enrollments:", courseError)
            }

            if (shopError) {
                console.error("Error loading shop purchases:", shopError)
            }

            const normalized = (courseData || [])
                .map((row: any) => ({
                    enrollment_id: row.id,
                    enrolled_at: row.enrolled_at,
                    amount_paid: Number(row.amount_paid ?? row.courses?.price ?? 0),
                    course: row.courses,
                }))
                .filter((row: PaidEnrollment) => row.course?.is_paid)

            setItems(normalized)

            const normalizedShopOrders: ShopPurchaseOrder[] = (shopData || []).map((row: any) => ({
                id: row.id,
                created_at: row.created_at,
                total_amount: Number(row.total_amount ?? 0),
                status: row.status,
                payment_method: row.payment_method,
                items: (row.shop_order_items || []).map((item: any) => ({
                    id: item.id,
                    quantity: Number(item.quantity ?? 0),
                    line_total: Number(item.line_total ?? 0),
                    product_name: item.product_name,
                    slug: item.shop_products?.slug ?? null,
                })),
            }))

            setShopOrders(normalizedShopOrders)
            setIsLoading(false)
        }

        loadOrders()
    }, [user, supabase])

    const totalSpent = useMemo(() => {
        return items.reduce((sum, item) => sum + (Number((item as any).amount_paid ?? item.course.price ?? 0) || 0), 0)
    }, [items])

    const totalShopSpent = useMemo(() => {
        return shopOrders.reduce((sum, order) => sum + order.total_amount, 0)
    }, [shopOrders])

    const handleCheckoutConfirm = async () => {
        setCheckingOut(true)

        try {
            const orderId = await checkout()
            toast({
                title: 'Purchase completed',
                description: `Demo order created: ${orderId}`,
            })
            setCartOpen(false)
        } catch (error: any) {
            toast({
                title: 'Checkout failed',
                description: error?.message || 'Please try again.',
                variant: 'destructive',
            })
            throw error
        } finally {
            setCheckingOut(false)
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center min-h-[50vh]">
                <div className="animate-pulse text-base sm:text-xl">{t('orders.loading', 'Loading orders...')}</div>
            </div>
        )
    }

    if (!user) return null

    return (
        <div className="container px-4 sm:px-6 lg:px-10 py-6 md:py-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 md:mb-8 gap-3 md:gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold font-montserrat">{t('orders.title', 'My Orders')}</h1>
                    <p className="text-muted-foreground">{t('orders.subtitle', 'Paid courses and shop purchases')}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" onClick={() => setCartOpen(true)}>
                        <ShoppingCart className="mr-2 h-4 w-4" />
                        View cart ({totals.items})
                    </Button>
                    <Button asChild>
                        <TransitionLink href="/learn">{t('orders.browseCourses', 'Browse courses')}</TransitionLink>
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-4 md:gap-6">
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                <ShoppingBag className="h-5 w-5 text-primary" />
                                {t('orders.section.title', 'Orders')}
                            </CardTitle>
                            <CardDescription>
                                {items.length} {t('orders.paidCourse', 'paid course')}{items.length === 1 ? '' : 's'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-6 text-muted-foreground">{t('orders.loadingMine', 'Loading your orders...')}</div>
                            ) : items.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground mb-4">{t('orders.empty', 'No paid courses yet.')}</p>
                                    <Button asChild>
                                        <TransitionLink href="/shop">{t('orders.goShop', 'Go to shop')}</TransitionLink>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {items.map((item) => (
                                        <div
                                            key={item.enrollment_id}
                                            className="flex flex-col sm:flex-row gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg border bg-card/50"
                                        >
                                            <div className="w-full sm:w-1/4 h-32 sm:h-24 rounded-md overflow-hidden">
                                                <img
                                                    src={item.course.hero_image || item.course.image_url || "https://placehold.co/600x400"}
                                                    alt={item.course.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            </div>

                                            <div className="flex-1">
                                                <div className="flex flex-wrap items-center justify-between gap-2">
                                                    <h3 className="font-semibold">{item.course.title}</h3>
                                                    <Badge className="bg-emerald-600">{t('orders.badge.paid', 'Paid')}</Badge>
                                                </div>

                                                <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                                                    <span className="inline-flex items-center gap-1">
                                                        <Calendar className="h-4 w-4" />
                                                        {new Date(item.enrolled_at).toLocaleDateString(locale)}
                                                    </span>
                                                    <span className="inline-flex items-center gap-1">
                                                        <CreditCard className="h-4 w-4" />
                                                        {formatEthiopianBirr((item as any).amount_paid ?? item.course.price)}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="flex items-center justify-start sm:justify-end">
                                                <Button variant="outline" size="sm" className="w-full sm:w-auto" asChild>
                                                    <TransitionLink href={item.course.slug ? `/learn/course/${item.course.slug}` : "/learn"}>
                                                        {t('orders.viewCourse', 'View course')}
                                                    </TransitionLink>
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                <Receipt className="h-5 w-5 text-primary" />
                                Shop Purchases
                            </CardTitle>
                            <CardDescription>
                                Products you bought from the shop
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {isLoading ? (
                                <div className="text-center py-6 text-muted-foreground">Loading your purchases...</div>
                            ) : shopOrders.length === 0 ? (
                                <div className="text-center py-6">
                                    <p className="text-muted-foreground mb-4">No shop purchases yet.</p>
                                    <Button asChild>
                                        <TransitionLink href="/shop">Browse shop</TransitionLink>
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {shopOrders.map((order) => (
                                        <div key={order.id} className="rounded-lg border bg-card/50 p-4">
                                            <div className="flex flex-wrap items-center justify-between gap-2">
                                                <div className="text-sm text-muted-foreground">
                                                    Order #{order.id.slice(0, 8)} • {new Date(order.created_at).toLocaleDateString(locale)}
                                                </div>
                                                <Badge className="bg-emerald-600">{order.status}</Badge>
                                            </div>

                                            <div className="mt-3 space-y-2">
                                                {order.items.map((item) => (
                                                    <div key={item.id} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                                        <span>
                                                            {item.product_name} x {item.quantity}
                                                        </span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="text-muted-foreground">{formatEthiopianBirr(item.line_total)}</span>
                                                            {item.slug ? (
                                                                <Button variant="ghost" size="sm" asChild>
                                                                    <TransitionLink href={`/shop/${item.slug}`}>View</TransitionLink>
                                                                </Button>
                                                            ) : null}
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="mt-3 border-t pt-3 flex items-center justify-between text-sm">
                                                <span className="text-muted-foreground">Order total</span>
                                                <span className="font-semibold">{formatEthiopianBirr(order.total_amount)}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                                <BookOpen className="h-5 w-5 text-primary" />
                                {t('orders.summary.title', 'Summary')}
                            </CardTitle>
                            <CardDescription>{t('orders.summary.subtitle', 'Paid course totals')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('orders.summary.courses', 'Courses')}</span>
                                <span className="font-medium">{items.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">{t('orders.summary.totalSpent', 'Total spent')}</span>
                                <span className="font-medium">{formatEthiopianBirr(totalSpent)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Shop spent</span>
                                <span className="font-medium">{formatEthiopianBirr(totalShopSpent)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-muted-foreground">Grand total</span>
                                <span className="font-semibold">{formatEthiopianBirr(totalSpent + totalShopSpent)}</span>
                            </div>
                            <Button variant="secondary" className="w-full" asChild>
                                <TransitionLink href="/dashboard">{t('orders.backDashboard', 'Back to dashboard')}</TransitionLink>
                            </Button>
                        </CardContent>
                    </Card>
                </div>
            </div>
        <CartSheet
            open={cartOpen}
            onOpenChange={setCartOpen}
            items={cartItems}
            subtotal={totals.subtotal}
            totalItems={totals.items}
            loading={cartLoading}
            checkingOut={checkingOut}
            onIncrease={(id, qty) => updateQuantity(id, qty + 1)}
            onDecrease={(id, qty) => updateQuantity(id, qty - 1)}
            onRemove={removeItem}
            onCheckout={() => {
                if (!user) {
                    toast({ title: 'Login required', description: 'Please log in to checkout.' })
                    return
                }
                setCheckoutOpen(true)
            }}
        />

        <CheckoutModal
            open={checkoutOpen}
            onOpenChange={setCheckoutOpen}
            totalAmount={totals.subtotal}
            onConfirm={handleCheckoutConfirm}
        />
        </div>
    )
}
