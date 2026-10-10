import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Admin order detail is shown inline in the Orders list (click "Detail").
// This route redirects there to keep a single source of truth.
export default function AdminOrderDetail() {
  const navigate = useNavigate();
  useEffect(() => {
    navigate('/admin/orders', { replace: true });
  }, [navigate]);
  return null;
}
