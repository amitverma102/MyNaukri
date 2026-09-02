import { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Typography, Box, CircularProgress, Tabs, Tab } from '@mui/material';
import api from '../../api/axios';

interface RechargeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function RechargeModal({ open, onClose, onSuccess }: RechargeModalProps) {
  const [tab, setTab] = useState(0); // 0: Top-Up, 1: Annual Recharge
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<any>(null);
  
  useEffect(() => {
    if (open) {
      setCredits(0);
      setQuote(null);
      setTab(0);
    }
  }, [open]);

  useEffect(() => {
    if (credits > 0) {
      fetchQuote();
    } else {
      setQuote(null);
    }
  }, [credits, tab]);

  const fetchQuote = async () => {
    try {
      const isEarlyRenewal = tab === 1;
      const res = await api.get(`/instituteadmin/wallet/quote?amount=${credits}&isEarlyRenewal=${isEarlyRenewal}`);
      setQuote(res.data);
    } catch (err) {
      console.error('Failed to get quote', err);
    }
  };

  const handleRecharge = async () => {
    if (credits <= 0) return;
    setLoading(true);
    try {
      const isAnnualRecharge = tab === 1;
      
      // 1. Create order
      const orderRes = await api.post('/instituteadmin/wallet/create-order', {
        credits,
        isAnnualRecharge
      });
      const { orderId, amount, currency, key } = orderRes.data;

      // 2. Open Razorpay checkout
      const options = {
        key: key,
        amount: amount * 100, // Amount in paise
        currency: currency,
        name: 'MyNaukri Credits',
        description: isAnnualRecharge ? 'Annual Recharge' : 'Credits Top-Up',
        order_id: orderId,
        handler: async function (response: any) {
          try {
            // 3. Verify payment on backend
            await api.post('/instituteadmin/wallet/verify-payment', {
              razorpayPaymentId: response.razorpay_payment_id,
              razorpayOrderId: response.razorpay_order_id,
              razorpaySignature: response.razorpay_signature
            });
            alert('Payment successful and credits added!');
            onSuccess();
          } catch (err: any) {
            console.error('Payment verification failed', err);
            alert('Payment verified failed: ' + (err.response?.data?.message || 'Unknown error'));
          } finally {
            setLoading(false);
          }
        },
        prefill: {
          name: 'Institute Admin',
          email: 'admin@institute.com'
        },
        theme: {
          color: '#1976d2' // primary.main color
        },
        modal: {
          ondismiss: function () {
            alert('Transaction Cancelled by user');
            setLoading(false);
          }
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function (response: any) {
        console.error('Payment failed', response.error);
        alert('Payment failed: ' + response.error.description);
        setLoading(false);
      });
      
      rzp.open();
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.message || 'Failed to initiate recharge.');
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Recharge Credits</DialogTitle>
      <DialogContent dividers>
        <Tabs value={tab} onChange={(_, newVal) => setTab(newVal)} sx={{ mb: 2 }}>
          <Tab label="Top-Up" />
          <Tab label="Annual Recharge" />
        </Tabs>

        <Box sx={{ mb: 2 }}>
          {tab === 0 ? (
            <Typography variant="body2" color="textSecondary">
              Add credits that do not affect expiry date.
            </Typography>
          ) : (
            <Typography variant="body2" color="textSecondary">
              Recharge your credits and optionally benefit from early renewal discounts up to 50% based on your unused balance and days to expiry (eligible within 45 days of expiry).
            </Typography>
          )}
        </Box>

        <TextField
          autoFocus
          margin="dense"
          label="Number of Credits"
          type="number"
          fullWidth
          variant="outlined"
          value={credits || ''}
          onChange={(e) => setCredits(Number(e.target.value))}
        />

        {quote && (
          <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>Quote Summary</Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Base Price: <strong>₹{quote.basePrice}</strong> (₹{quote.pricePerCredit} / credit)</Typography>
            {quote.discountPercentage > 0 && (
              <Typography variant="body2" color="success.main">
                Early Renewal Discount ({quote.discountPercentage.toFixed(2)}%): <strong>-₹{quote.discountAmount}</strong>
              </Typography>
            )}
            <Typography variant="h6" sx={{ mt: 1, color: 'primary.main' }}>
              Final Price: ₹{quote.finalPrice}
            </Typography>
          </Box>
        )}
      </DialogContent>
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} disabled={loading}>Cancel</Button>
        <Button 
          onClick={handleRecharge} 
          variant="contained" 
          color="primary" 
          disabled={loading || credits <= 0}
        >
          {loading ? <CircularProgress size={24} /> : 'Confirm Payment'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
