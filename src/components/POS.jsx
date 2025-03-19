import React, { useState, useEffect } from 'react';
import { loadStripeTerminal } from '@stripe/terminal-js';
import { PlusCircle, MinusCircle, ShoppingCart, CreditCard } from 'lucide-react';

const POS = () => {
  const [cart, setCart] = useState([]);
  const [terminal, setTerminal] = useState(null);
  const [paymentStatus, setPaymentStatus] = useState('');
  const [error, setError] = useState(null);
  const [discoveredReaders, setDiscoveredReaders] = useState([]);

  // Sample products
  const products = [
    { id: 1, name: 'Coffee', price: 350 }, // prices in cents
    { id: 2, name: 'Sandwich', price: 899 },
    { id: 3, name: 'Salad', price: 799 },
    { id: 4, name: 'Smoothie', price: 599 },
  ];

  useEffect(() => {
    initializeTerminal();
  }, []);

  const initializeTerminal = async () => {
    try {
      console.log('Initializing Stripe Terminal...');
      const StripeTerminal = await loadStripeTerminal();
      console.log('Stripe Terminal SDK Loaded:', StripeTerminal);

      if (!StripeTerminal) {
        console.error("Stripe Terminal SDK not loaded.");
        return;
      }

      const terminalInstance = StripeTerminal.create({
        onFetchConnectionToken: async () => {
          console.log('Fetching connection token...');
          const response = await fetch('http://localhost:4242/connection_token', {
            method: 'POST',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch connection token: ${response.statusText}`);
          }

          const { secret } = await response.json();
          console.log('Connection token fetched successfully:', secret);
          return secret;
        },
        onUnexpectedReaderDisconnect: () => {
          setError('Reader disconnected unexpectedly');
        },
      });

      console.log('Terminal instance created:', terminalInstance);
      setTerminal(terminalInstance);
      
      console.log('Discovering readers...');
      const discoveredReaders = await terminalInstance.discoverReaders({ simulated: true });
      console.log('Discovered Readers:', discoveredReaders);

      if (!discoveredReaders || !Array.isArray(discoveredReaders.discoveredReaders) || discoveredReaders.discoveredReaders.length === 0) {
        console.error("No readers found.");
        setError("No readers found.");
        return;
      }

      console.log('Attempting to connect to the first reader...');
      const connectResult = await terminalInstance.connectReader(discoveredReaders.discoveredReaders?.[0]);

      if (connectResult.error) {
        console.error('Failed to connect to reader:', connectResult.error);
        setError('Failed to connect to reader');
      } else {
        console.log('Reader connected successfully');
        setError(null);
      }

    } catch (err) {
      console.error('Failed to initialize terminal:', err);
      setError('Failed to initialize terminal');
    }
  };

  const discoverReaders = async () => {
    try {
      const config = { simulated: true };
      const discoverResult = await terminal.discoverReaders(config);
      if (discoverResult.error) {
        console.error('Failed to discover readers:', discoverResult.error);
        setError('Failed to discover readers');
      } else if (discoverResult.discoveredReaders.length === 0) {
        console.log('No available readers.');
        setError('No available readers.');
      } else {
        setDiscoveredReaders(discoverResult.discoveredReaders);
        console.log('Readers discovered:', discoverResult.discoveredReaders);
      }
    } catch (err) {
      console.error('Failed to discover readers:', err);
      setError('Failed to discover readers');
    }
  };

  const connectReader = async (reader) => {
    try {
      const connectResult = await terminal.connectReader(reader);
      if (connectResult.error) {
        console.error('Failed to connect to reader:', connectResult.error);
        setError('Failed to connect to reader');
      } else {
        console.log('Reader connected successfully');
        setError(null);
      }
    } catch (err) {
      console.error('Failed to connect to reader:', err);
      setError('Failed to connect to reader');
    }
  };

  const addToCart = (product) => {
    const existingItem = cart.find(item => item.id === product.id);
    if (existingItem) {
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
  };

  const removeFromCart = (productId) => {
    setCart(cart.map(item =>
      item.id === productId && item.quantity > 0
        ? { ...item, quantity: item.quantity - 1 }
        : item
    ).filter(item => item.quantity > 0));
  };

  const getTotalAmount = () => {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
  };

  const handlePayment = async () => {
    try {
      if (!terminal || terminal.connectionStatus !== 'connected') {
        setError('Reader is not connected. Please try again.');
        return;
      }

      setPaymentStatus('processing');

      // Create PaymentIntent
      const response = await fetch('http://localhost:4242/create_payment_intent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: getTotalAmount(),
        }),
      });

      const { client_secret } = await response.json();

      // Collect payment method
      console.log('Collecting payment method...');
      const collectResult = await terminal.collectPaymentMethod(client_secret);

      if (collectResult.error) {
        console.error('Failed to collect payment method:', collectResult.error);
        throw new Error(collectResult.error.message);
      }

      // Process payment
      console.log('Processing payment...');
      const processResult = await terminal.processPayment(collectResult.paymentIntent);

      if (processResult.error) {
        console.error('Failed to process payment:', processResult.error);
        throw new Error(processResult.error.message);
      }

      setPaymentStatus('success');
      setTimeout(() => {
        setCart([]);
        setPaymentStatus('');
      }, 2000);
    } catch (err) {
      console.error('Payment failed:', err);
      setError(err.message);
      setPaymentStatus('failed');
    }
  };

  return (
    <div className="min-h-screen min-w-screen bg-black p-4">
      <script src="https://js.stripe.com/terminal/v1/"></script>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="border border-zinc-700/80 bg-zinc-900 p-4 rounded-lg shadow-sm mb-4">
          <h1 className="text-2xl font-bold text-white">POS System</h1>
          {error && (
            <div className="mt-2 text-red-500 text-sm">{error}</div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Products Section */}
          <div className="md:col-span-2 border border-zinc-700/80 bg-zinc-900 p-4 rounded-lg shadow-sm">
            <h2 className="text-xl text-white font-semibold mb-4">Products</h2>
            <div className="grid grid-cols-2 gap-4">
              {products.map(product => (
                <div key={product.id} className="border border-zinc-700/60 bg-zinc-900 p-4 rounded-lg">
                  <h3 className="font-medium">{product.name}</h3>
                  <p className="text-white ">${(product.price / 100).toFixed(2)}</p>
                  <button
                    onClick={() => addToCart(product)}
                    className="mt-2 bg-zinc-800 text-white hover:text-blue-500/70 px-4 py-2 rounded-lg hover:border-white/30 hover:bg-zinc-800/40 w-full"
                  >
                    Add to Cart
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Cart Section */}
          <div className="border border-zinc-700/70 bg-zinc-900 p-4 rounded-lg shadow-sm">
            <div className="flex items-center mb-4">
              <ShoppingCart className="mr-2" />
              <h2 className="text-xl font-semibold">Cart</h2>
            </div>
            
            {cart.map(item => (
              <div key={item.id} className="flex justify-between items-center mb-2 p-4 border border-zinc-700/60 bg-zinc-900 rounded">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-sm text-white">
                    ${(item.price / 100).toFixed(2)} x {item.quantity}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => removeFromCart(item.id)}
                    className="border border-zinc-700/60 bg-zinc-900 text-red-500 hover:text-red-600"
                  >
                    <MinusCircle size={20} />
                  </button>
                  <button
                    onClick={() => addToCart(item)}
                    className="border border-zinc-700/60 bg-zinc-900 text-green-500 hover:text-green-600"
                  >
                    <PlusCircle size={20} />
                  </button>
                </div>
              </div>
            ))}

            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center mb-4">
                <span className="font-semibold">Total:</span>
                <span className="font-semibold">
                  ${(getTotalAmount() / 100).toFixed(2)}
                </span>
              </div>

              <button
                onClick={handlePayment}
                disabled={!terminal || terminal.connectionStatus !== 'connected' || cart.length === 0 || paymentStatus === 'processing'}
                className="w-full bg-zinc-800 text-white hover:text-blue-500/70 px-4 py-2 rounded-lg hover:border-white/30 hover:bg-zinc-800/40 transition-colors disabled:text-gray-500/50 disabled:hover:border-red-900 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <CreditCard size={20} />
                {paymentStatus === 'processing' ? 'Processing...' : 'Pay Now'}
              </button>
            </div>

            {/* Payment Status */}
            {paymentStatus && (
              <div className="mt-4 p-4 rounded-lg bg-transparent border border-zinc-700">
                <div className="text-center">
                  {paymentStatus === 'processing' && (
                    <p className="text-blue-500">Processing payment...</p>
                  )}
                  {paymentStatus === 'success' && (
                    <p className="text-green-500">Payment successful!</p>
                  )}
                  {paymentStatus === 'failed' && (
                    <p className="text-red-500">Payment failed. Please try again.</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
