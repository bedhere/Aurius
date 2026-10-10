import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, ApiError } from '../../api/client';
import { Cart } from '../../api/types';
import { Alert, Spinner } from '../../components/ui';
import { fmtMoney } from '../../utils/format';
import { formatVariantSelection } from '../../utils/variant';
import '../../assets/styles/pages-member.css';

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [message, setMessage] = useState<{ type: 'error'; text: string } | null>(null);

  const load = () => api.get<Cart>('/api/cart').then(setCart).catch(() => setCart(null));
  useEffect(() => {
    load();
  }, []);

  if (cart === null) return <Spinner />;

  const updateQty = async (itemId: number, quantity: number) => {
    setMessage(null);
    try {
      await api.put(`/api/cart/${itemId}`, { quantity });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: (err as ApiError).message });
    }
  };

  const remove = async (itemId: number) => {
    await api.delete(`/api/cart/${itemId}`);
    load();
  };

  const clear = async () => {
    await api.delete('/api/cart');
    load();
  };

  return (
    <>
      <h2>My Cart</h2>
      {message && <Alert type="error">{message.text}</Alert>}

      {cart.items.length === 0 ? (
        <div className="panel">
          <p className="muted">Your cart is empty.</p>
          <Link to="/products" className="btn btn-primary">
            Browse Products
          </Link>
        </div>
      ) : (
        <>
          <div className="panel">
            {cart.items.map((i) => (
              <div className="cart-line" key={i.id}>
                <img src={i.image ?? '/favicon.svg'} alt={i.name} />
                <div>
                  <div>{i.name}</div>
                  <div className="small muted">
                    {i.sku} · {fmtMoney(i.unitPrice)} each
                  </div>
                  {formatVariantSelection(i.variantName, i.variantAttributes) && (
                    <div className="cart-line__variant">
                      Selected: {formatVariantSelection(i.variantName, i.variantAttributes)}
                    </div>
                  )}
                </div>
                <input
                  className="qty-input"
                  type="number"
                  min={0}
                  defaultValue={i.quantity}
                  onBlur={(e) => {
                    const v = parseInt(e.target.value, 10);
                    if (!Number.isNaN(v) && v !== i.quantity) updateQty(i.id, v);
                  }}
                />
                <div className="small">{fmtMoney(i.lineTotal)}</div>
                <button className="btn btn-ghost btn-sm" onClick={() => remove(i.id)}>
                  Remove
                </button>
              </div>
            ))}
            <div className="flex items-center mt-2">
              <button className="btn btn-ghost btn-sm" onClick={clear}>
                Clear cart
              </button>
              <span className="spacer" />
              <div style={{ fontSize: 20, fontWeight: 700 }}>
                Subtotal: <span className="price">{fmtMoney(cart.subtotal)}</span>
              </div>
            </div>
          </div>
          <div className="flex gap-2" style={{ justifyContent: 'flex-end' }}>
            <Link to="/products" className="btn btn-ghost">
              Continue Shopping
            </Link>
            <Link to="/member/checkout" className="btn btn-primary btn-lg">
              Proceed to Checkout
            </Link>
          </div>
        </>
      )}
    </>
  );
}
