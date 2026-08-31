"use client";
import { useState, useMemo, useEffect } from "react";
import { useDispatch } from "react-redux";
import { setHideHeader } from "@/app/provider/slices/ui-slice";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Ticket, Check, Loader2, Plus, Minus, AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useGetTicketsQuery } from "@/app/provider/api/eventApi";
import { useInitiatePurchaseMutation } from "@/app/provider/api/paymentApi";
import Image from "next/image";

interface TicketItem {
  id: string;
  name: string;
  description: string;
  price: number;
  available: number;
  imageUrl: string | null;
}

interface TicketPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  eventName: string;
  eventId?: string;
  onPurchaseComplete: (ticketTierId: string) => void;
  setTicketTierId?: (id: string) => void;
}

const formatPrice = (price: number) =>
  price === 0
    ? "Free"
    : new Intl.NumberFormat("en-NG", {
        style: "currency",
        currency: "NGN",
        minimumFractionDigits: 0,
      }).format(price);

export function TicketPurchaseModal({
  open,
  onOpenChange,
  eventName,
  eventId,
  onPurchaseComplete,
  setTicketTierId,
}: TicketPurchaseModalProps) {
  const dispatch = useDispatch();

  const { data: ticketsResponse, isLoading } = useGetTicketsQuery(
    eventId ?? "",
    { skip: !eventId }
  );
  const [initiatePurchase, { isLoading: isPurchasing }] =
    useInitiatePurchaseMutation();

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  useEffect(() => {
    dispatch(setHideHeader(open));
    return () => {
      dispatch(setHideHeader(false));
    };
  }, [open, dispatch]);

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setSelectedId(null);
      setQuantities({});
    }
    onOpenChange(next);
  };

  const tickets: TicketItem[] = useMemo(
    () =>
      (ticketsResponse?.data ?? []).map((t: any) => ({
        id: t.id,
        name: t.name,
        description: t.description ?? "",
        price: Number(t.price),
        available: t.quantity - (t.quantitySold ?? 0),
        imageUrl: t.imageUrl ?? null,
      })),
    [ticketsResponse]
  );

  const getQty = (id: string) => quantities[id] ?? 1;
  const selected = tickets.find((t) => t.id === selectedId);
  const selectedQty = selected ? getQty(selected.id) : 1;
  const total = selected ? selected.price * selectedQty : 0;

  const handleConfirm = async () => {
    if (!selected || !eventId) return;
    if (selected.price === 0) {
      setTicketTierId?.(selected.id);
      onPurchaseComplete(selected.id);
      handleOpenChange(false);
      return;
    }
    try {
      const res = await initiatePurchase({
        eventId,
        ticketTiers: [{ tierId: selected.id, quantity: selectedQty }],
      }).unwrap();
      window.location.href = res.data.checkoutUrl;
    } catch (err: any) {
      toast.error(
        err?.data?.message ?? err?.message ?? "Failed to initiate purchase."
      );
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="flex flex-col gap-0 p-0 max-w-md w-[95%] max-h-[85dvh] rounded-2xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-5 pt-5 pb-3 border-b border-border">
          <div className="flex items-center gap-2 mb-1">
            <Ticket className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold">Get Tickets</h2>
          </div>
          <p className="text-sm text-muted-foreground">
            Choose your tickets for{" "}
            <span className="font-semibold text-foreground">{eventName}</span>
          </p>
        </div>

        <div className="overflow-y-auto overscroll-contain">
          {/* Scrollable list */}
          <div className="flex-1  px-4 py-3 space-y-2.5 min-h-0">
            {isLoading ? (
              <div className="flex justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-xl border border-border p-6 text-center space-y-3">
                <p className="text-sm text-muted-foreground">
                  No ticket tiers set for this event.
                </p>
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    onPurchaseComplete("");
                    handleOpenChange(false);
                  }}
                >
                  <Check className="h-4 w-4" />
                  Confirm RSVP
                </Button>
              </div>
            ) : (
              tickets.map((ticket: TicketItem) => {
                const qty = getQty(ticket.id);
                const isSelected = selectedId === ticket.id;
                const soldOut = ticket.available <= 0;

                return (
                  <div
                    key={ticket.id}
                    className={cn(
                      "rounded-xl border-2 overflow-hidden transition-all duration-200",
                      isSelected ? "border-primary" : "border-border",
                      soldOut && "opacity-50"
                    )}
                  >
                    {/* Image */}
                    {ticket.imageUrl && (
                      <button
                        disabled={soldOut}
                        className="w-full"
                        onClick={() => setSelectedId(ticket.id)}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <Image
                          src={ticket.imageUrl}
                          alt={ticket.name}
                          width={400}
                          height={144}
                          className="w-full h-auto object-contain"
                        />
                      </button>
                    )}

                    {/* Info row */}
                    <button
                      disabled={soldOut}
                      className="w-full text-left px-4 py-3"
                      onClick={() => setSelectedId(ticket.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-sm">
                              {ticket.name}
                            </span>
                            {isSelected && (
                              <Check className="h-3.5 w-3.5 text-primary shrink-0" />
                            )}
                          </div>
                          {ticket.description && (
                            <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                              {ticket.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {soldOut ? (
                              <span className="text-red-500 font-medium">
                                Sold out
                              </span>
                            ) : (
                              `${ticket.available} left`
                            )}
                          </p>
                        </div>
                        <Badge
                          variant={isSelected ? "default" : "secondary"}
                          className="text-xs font-semibold shrink-0"
                        >
                          {formatPrice(ticket.price)}
                        </Badge>
                      </div>
                    </button>

                    {/* Quantity stepper */}
                    {isSelected && ticket.price > 0 && (
                      <div className="flex items-center justify-between px-4 py-2.5 border-t border-border">
                        <span className="text-sm text-muted-foreground">
                          Quantity
                        </span>
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => {
                              if (qty === 1) {
                                setSelectedId(null);
                                setQuantities((q) => {
                                  const { [ticket.id]: _, ...rest } = q;
                                  return rest;
                                });
                              } else {
                                setQuantities((q) => ({
                                  ...q,
                                  [ticket.id]: qty - 1,
                                }));
                              }
                            }}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:bg-muted transition-colors"
                          >
                            <Minus className="h-3.5 w-3.5" />
                          </button>
                          <span className="w-5 text-center font-semibold text-sm tabular-nums">
                            {qty}
                          </span>
                          <button
                            onClick={() =>
                              setQuantities((q) => ({
                                ...q,
                                [ticket.id]: Math.min(
                                  ticket.available,
                                  qty + 1
                                ),
                              }))
                            }
                            disabled={qty >= ticket.available}
                            className="flex h-7 w-7 items-center justify-center rounded-full border border-border hover:bg-muted disabled:opacity-40 transition-colors"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          {selected && (
            <div className="shrink-0 px-4 py-4 border-t border-border space-y-2 bg-background">
              {selected.price > 0 && (
                <div className="flex items-center justify-between rounded-lg bg-muted/60 px-4 py-2.5">
                  <span className="text-sm text-muted-foreground">
                    {selectedQty} × {selected.name}
                  </span>
                  <span className="font-semibold text-sm">
                    {formatPrice(total)}
                  </span>
                </div>
              )}
              {selected.price > 0 && (
                <div className="flex items-start gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3 py-2">
                  <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    You&apos;ll be redirected to Ercaspay to complete payment
                    securely.
                  </p>
                </div>
              )}
              <Button
                className="w-full gap-2 h-11 text-sm font-semibold"
                disabled={isPurchasing}
                onClick={handleConfirm}
              >
                {isPurchasing ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Processing…
                  </>
                ) : selected.price === 0 ? (
                  <>
                    <Check className="h-4 w-4" />
                    Confirm RSVP (Free)
                  </>
                ) : (
                  <>
                    <Ticket className="h-4 w-4" />
                    Pay {formatPrice(total)}
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
