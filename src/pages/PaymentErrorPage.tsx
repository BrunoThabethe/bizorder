import { Link } from "react-router-dom";
import { XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

const PaymentErrorPage = () => (
  <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center px-6 text-center">
    <XCircle className="h-12 w-12 text-destructive" />
    <h1 className="mt-4 font-display text-2xl font-bold">Payment didn't go through</h1>
    <p className="mt-2 text-sm text-muted-foreground">
      No charge was made. You can try again from your order or quote.
    </p>
    <div className="mt-6 flex gap-3">
      <Button asChild variant="outline">
        <Link to="/customer/orders">My orders</Link>
      </Button>
      <Button asChild>
        <Link to="/customer/quotes">My quotes</Link>
      </Button>
    </div>
  </main>
);

export default PaymentErrorPage;
