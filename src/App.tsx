import { useEffect, useMemo, useState } from "react";
import * as StellarSdk from "@stellar/stellar-sdk";
import { isConnected, requestAccess, signTransaction } from "@stellar/freighter-api";
import {
  ArrowDownLeft, ArrowDownUp, ArrowLeftRight, ArrowUpRight, Bell, Check,
  ChevronDown, CircleHelp, Globe2, LayoutDashboard,
  Menu, Moon, MoreHorizontal, RefreshCw, Send, Settings2, ShieldCheck,
  Sparkles, Sun, Wallet, X, Zap
} from "lucide-react";

type Currency = "USD" | "NGN" | "EUR" | "GBP" | "GHS" | "KES";
const currencyMeta: Record<Currency, { name: string; flag: string; symbol: string }> = {
  USD: { name: "US Dollar", flag: "🇺🇸", symbol: "$" },
  NGN: { name: "Nigerian Naira", flag: "🇳🇬", symbol: "₦" },
  EUR: { name: "Euro", flag: "🇪🇺", symbol: "€" },
  GBP: { name: "British Pound", flag: "🇬🇧", symbol: "£" },
  GHS: { name: "Ghanaian Cedi", flag: "🇬🇭", symbol: "GH₵" },
  KES: { name: "Kenyan Shilling", flag: "🇰🇪", symbol: "KSh" },
};
const demoRates: Record<Currency, number> = { USD: 1, NGN: 1600, EUR: 0.92, GBP: 0.79, GHS: 15.2, KES: 129.5 };
const money = (amount: number, currency: Currency) => new Intl.NumberFormat("en-US", {
  style: "currency", currency, maximumFractionDigits: currency === "NGN" || currency === "KES" ? 0 : 2,
}).format(Number.isFinite(amount) ? amount : 0);

function App() {
  const [dark, setDark] = useState(true);
  const [active, setActive] = useState("Overview");
  const [amount, setAmount] = useState("250");
  const [from, setFrom] = useState<Currency>("USD");
  const [to, setTo] = useState<Currency>("NGN");
  const [recipient, setRecipient] = useState("");
  const [showRecipient, setShowRecipient] = useState(false);
  const [notice, setNotice] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [xlmBalance, setXlmBalance] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState("1");
  const [paymentDestination, setPaymentDestination] = useState("");
  const [paymentBusy, setPaymentBusy] = useState(false);
  const [paymentHash, setPaymentHash] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "confirmed">("idle");
  const [chainActivity, setChainActivity] = useState<Array<{ id: string; hash: string; createdAt: string; source: string; destination: string; amount: string }>>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [activityFilter, setActivityFilter] = useState("All activity");
  const [showAll, setShowAll] = useState(false);

  const rate = useMemo(() => demoRates[to] / demoRates[from], [from, to]);
  const sendAmount = Math.max(0, Number(amount) || 0);
  const fee = sendAmount * 0.005;
  const receiveAmount = Math.max(0, sendAmount - fee) * rate;
  const transactions = [
    { name: "Amara Okafor", detail: "Today, 10:42 AM · Cross-border transfer", amount: "-$320.00", status: "Completed", initials: "AO", color: "mint", kind: "sent" },
    { name: "Kwame Mensah", detail: "Yesterday, 4:18 PM · Cross-border transfer", amount: "+$185.00", status: "Completed", initials: "KM", color: "purple", kind: "received" },
    { name: "Sofia Bennett", detail: "Oct 20, 2:06 PM · Cross-border transfer", amount: "-$75.50", status: "Processing", initials: "SB", color: "peach", kind: "sent" },
    { name: "Daniel Kimani", detail: "Oct 19, 11:21 AM · Cross-border transfer", amount: "-$210.00", status: "Completed", initials: "DK", color: "blue", kind: "sent" },
  ];
  const shownTransactions = transactions.filter(t => activityFilter === "All activity" || (activityFilter === "Sent" ? t.kind === "sent" : t.kind === "received")).slice(0, showAll ? 4 : 3);

  const flipCurrencies = () => { setFrom(to); setTo(from); };
  const loadXlmBalance = async (address: string) => {
    setBalanceLoading(true);
    try {
      const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount(address);
      const native = account.balances.find((balance) => balance.asset_type === "native");
      setXlmBalance(native && "balance" in native ? native.balance : "0");
    } catch (error) {
      setXlmBalance(null);
      setNotice(error instanceof Error ? `Could not load Testnet balance: ${error.message}` : "Could not load Testnet balance.");
    } finally {
      setBalanceLoading(false);
    }
  };
  const loadOnchainActivity = async (address: string) => {
    setActivityLoading(true);
    try {
      const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
      const page = await server.operations().forAccount(address).order("desc").limit(20).call();
      const records = page.records as unknown as Array<{
        id: string; type: string; transaction_hash: string; created_at: string;
        source_account?: string; source?: string; to?: string; amount?: string; asset_type?: string;
      }>;
      setChainActivity(records
        .filter((record) => record.type === "payment" && record.asset_type === "native")
        .slice(0, 10)
        .map((record) => ({
          id: record.id,
          hash: record.transaction_hash,
          createdAt: record.created_at,
          source: record.source_account ?? record.source ?? "",
          destination: record.to ?? "",
          amount: record.amount ?? "0",
        })));
    } catch (error) {
      setNotice(error instanceof Error ? `Could not load on-chain history: ${error.message}` : "Could not load on-chain history.");
    } finally {
      setActivityLoading(false);
    }
  };
  useEffect(() => {
    if (walletConnected && walletAddress) {
      void loadXlmBalance(walletAddress);
      void loadOnchainActivity(walletAddress);
    }
  }, [walletConnected, walletAddress]);
  const sendTestnetPayment = async () => {
    setPaymentHash("");
    setPaymentStatus("idle");
    if (!walletConnected || !walletAddress) { setNotice("Connect Freighter before sending a Testnet payment."); return; }
    if (!StellarSdk.StrKey.isValidEd25519PublicKey(paymentDestination.trim())) { setNotice("Enter a valid Stellar public address beginning with G."); return; }
    const parsedAmount = Number(paymentAmount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0 || !/^\d+(\.\d{1,7})?$/.test(paymentAmount.trim())) { setNotice("Enter an XLM amount greater than zero with up to 7 decimal places."); return; }
    if (paymentDestination.trim() === walletAddress) { setNotice("Choose a different recipient address."); return; }
    setPaymentBusy(true);
    try {
      const server = new StellarSdk.Horizon.Server("https://horizon-testnet.stellar.org");
      const account = await server.loadAccount(walletAddress);
      const tx = new StellarSdk.TransactionBuilder(account, { fee: StellarSdk.BASE_FEE, networkPassphrase: StellarSdk.Networks.TESTNET })
        .addOperation(StellarSdk.Operation.payment({ destination: paymentDestination.trim(), asset: StellarSdk.Asset.native(), amount: parsedAmount.toFixed(7).replace(/\.?0+$/, "") }))
        .setTimeout(60)
        .build();
      setNotice("Review the payment details in Freighter. Nothing is submitted until you approve signing.");
      const signed = await signTransaction(tx.toXDR(), { networkPassphrase: StellarSdk.Networks.TESTNET, address: walletAddress });
      if (signed.error) throw new Error(signed.error.message);
      if (!signed.signedTxXdr) throw new Error("Freighter did not return a signed transaction.");
      const signedTx = StellarSdk.TransactionBuilder.fromXDR(signed.signedTxXdr, StellarSdk.Networks.TESTNET);
      const submitted = await server.submitTransaction(signedTx);
      setPaymentHash(submitted.hash);
      setPaymentStatus("confirmed");
      setNotice("Testnet payment confirmed by Horizon. Refreshing your balance and on-chain history.");
      await Promise.all([loadXlmBalance(walletAddress), loadOnchainActivity(walletAddress)]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "The payment could not be submitted.";
      setNotice(message.toLowerCase().includes("rejected") || message.toLowerCase().includes("declined") ? "Payment signing was cancelled in Freighter. No payment was submitted." : `Testnet payment failed: ${message}`);
    } finally {
      setPaymentBusy(false);
    }
  };
  const startTransfer = () => {
    if (!walletConnected) { setNotice("Connect Freighter before preparing a transfer."); return; }
    if (!recipient.trim()) { setShowRecipient(true); setNotice("Add a recipient address to continue."); return; }
    const trimmedRecipient = recipient.trim();
    if (StellarSdk.StrKey.isValidEd25519PublicKey(trimmedRecipient)) setPaymentDestination(trimmedRecipient);
    setNotice("This is an indicative fiat quote only; it does not send money. For an actual blockchain transfer, review the XLM amount and recipient in the Stellar Testnet payment panel below.");
    document.getElementById("testnet-payment")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const connectWallet = async () => {
    try {
      const connection = await isConnected();
      if (!connection.isConnected) {
        setNotice("Freighter was not detected. Install the Stellar Freighter wallet extension, then try again.");
        return;
      }
      const access = await requestAccess();
      if (access.error || !access.address) {
        setNotice(access.error?.message || "Wallet access was not approved.");
        return;
      }
      setWalletAddress(access.address);
      setWalletConnected(true);
      setNotice("Freighter connected. Testnet balance and native XLM payment history are loading.");
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "Could not connect to Freighter. Please try again.");
    }
  };

  return (
    <div className={dark ? "app dark" : "app light"}>
      <aside className={`sidebar ${mobileNav ? "sidebar-open" : ""}`}>
        <div className="brand"><div className="brand-mark"><ArrowLeftRight size={21} strokeWidth={2.5} /></div><span>cross<span className="brand-light">border</span><i>.</i></span></div>
        <div className="workspace-label">WORKSPACE</div>
        <nav className="nav-list">
          {[{ name: "Overview", icon: LayoutDashboard }, { name: "Transfers", icon: ArrowUpRight }, { name: "Activity", icon: RefreshCw }, { name: "Wallet", icon: Wallet }].map(({ name, icon: Icon }) =>
            <button key={name} className={`nav-item ${active === name ? "active" : ""}`} onClick={() => { setActive(name); setMobileNav(false); }}>
              <Icon size={18} /><span>{name}</span>{name === "Activity" && <span className="nav-dot" />}
            </button>
          )}
        </nav>
        <div className="workspace-label tools-label">PREFERENCES</div>
        <nav className="nav-list">
          <button className={`nav-item ${active === "Settings" ? "active" : ""}`} onClick={() => setActive("Settings")}><Settings2 size={18} /><span>Settings</span></button>
          <button className="nav-item" onClick={() => setNotice("Help centre is coming soon.")}><CircleHelp size={18} /><span>Help centre</span><ArrowUpRight size={14} className="nav-external" /></button>
        </nav>
        <div className="sidebar-bottom">
          <div className="network-card"><div className="network-top"><span className="network-dot" /> Stellar Testnet</div><p>You're exploring in demo mode.</p><span className="network-tag">TEST ENVIRONMENT</span></div>
          <div className="profile"><div className="profile-avatar">FC</div><div className="profile-copy"><strong>Francis Chikelu</strong><span>Personal account</span></div><MoreHorizontal size={19} className="muted-icon" /></div>
        </div>
      </aside>

      {mobileNav && <button aria-label="Close navigation" className="mobile-overlay" onClick={() => setMobileNav(false)} />}
      <main className="main">
        <header className="topbar">
          <div className="breadcrumb"><button className="mobile-menu" aria-label="Open navigation" onClick={() => setMobileNav(true)}><Menu size={20} /></button><span>Workspace</span><span className="crumb-slash">/</span><strong>{active}</strong></div>
          <div className="top-actions">
            <div className="network-pill"><span className="network-dot" /> Testnet</div>
            <button className="icon-button" aria-label="Toggle theme" onClick={() => setDark(!dark)}>{dark ? <Sun size={18} /> : <Moon size={18} />}</button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice("You're all caught up. No new notifications.")}><Bell size={18} /><i /></button>
            <button className={`connect-button ${walletConnected ? "connected" : ""}`} onClick={connectWallet}>{walletConnected ? <><Check size={16} /> {walletAddress.slice(0, 5)}…{walletAddress.slice(-4)}</> : <><Wallet size={16} /> Connect wallet</>}</button>
          </div>
        </header>

        <div className="content">
          <section className="welcome-row">
            <div><div className="eyebrow"><Sparkles size={13} /> YOUR MONEY, WITHOUT BORDERS</div><h1>Money moves.<br className="mobile-break" /> <span>You move forward.</span></h1><p className="welcome-subtitle">A clearer way to send across borders. No guesswork, just transparency.</p></div>
            <div className="date-label"><span className="date-pulse" /> LIVE DEMO ENVIRONMENT</div>
          </section>

          {notice && <div className="notice" role="status"><div className="notice-symbol"><CircleHelp size={17} /></div><span>{notice}</span><button aria-label="Dismiss message" onClick={() => setNotice("")}><X size={17} /></button></div>}

          <section className="overview-grid">
            <div className="balance-card">
              <div className="balance-orb orb-one" /><div className="balance-orb orb-two" />
              <div className="balance-heading"><span>DEMO ACCOUNT OVERVIEW</span><button onClick={() => setNotice("Demo balances are illustrative and are not real funds.")}><MoreHorizontal size={20} /></button></div>
              <div className="balance-label">Illustrative portfolio value <span className="info-dot">i</span></div>
              <div className="balance-value">$2,840<span>.50</span></div>
              <div className="balance-note"><span className="balance-arrow"><ArrowUpRight size={14} /></span> Demo data <span className="note-divider">·</span> Not real funds</div>
              <div className="balance-bottom"><div><span className="mini-label">AVAILABLE TO SEND</span><strong>$2,400.00</strong></div><div><span className="mini-label">ACTIVE TRANSFERS</span><strong>02 <span className="active-status">●</span></strong></div><button className="balance-send" onClick={() => document.getElementById("transfer-card")?.scrollIntoView({ behavior: "smooth", block: "center" })}>Send money <ArrowUpRight size={15} /></button></div>
            </div>
            <div className="stat-stack">
              <div className="stat-card"><div className="stat-top"><span className="stat-icon purple-icon"><Globe2 size={18} /></span><span className="stat-period">THIS MONTH</span></div><div className="stat-title">Total transferred</div><div className="stat-number">$1,284.50</div><div className="stat-footer"><span className="trend-pill"><ArrowUpRight size={13} /> 12.8%</span><span>vs. last month <span className="demo-tiny">· demo</span></span></div><div className="sparkline"><svg viewBox="0 0 140 32" preserveAspectRatio="none"><path d="M0 26 C12 25 13 16 25 19 S42 25 51 13 S68 22 80 10 S100 19 110 8 S129 12 140 2" /></svg></div></div>
              <div className="stat-card stat-second"><div className="stat-top"><span className="stat-icon green-icon"><Zap size={18} /></span><span className="stat-period">NETWORK</span></div><div className="stat-title">Settlement speed</div><div className="stat-number">~5 sec<span className="number-caption"> target</span></div><div className="stat-footer"><span className="network-dot" /><span>Stellar network capability</span></div></div>
            </div>
          </section>

          <section className="lower-grid">
            <div className="panel transfer-panel" id="transfer-card">
              <div className="panel-heading"><div><div className="section-kicker">QUICK ACTION</div><h2>Send across borders</h2><p>Preview your transfer before you send.</p></div><div className="heading-icon"><Send size={17} /></div></div>
              <div className="transfer-form">
                <label className="field-label" htmlFor="send-amount">YOU SEND</label>
                <div className="currency-input"><input id="send-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value.replace(/[^0-9.]/g, ""))} aria-label="Amount to send" /><button className="currency-select" onClick={() => setFrom(currency => { const currencies = Object.keys(currencyMeta) as Currency[]; return currencies[(currencies.indexOf(currency) + 1) % currencies.length]; })} aria-label="Change sending currency"><span className="flag">{currencyMeta[from].flag}</span><span>{from}</span><ChevronDown size={15} /></button></div>
                <div className="swap-row"><div className="rate-label"><span className="rate-indicator" /> Indicative demo rate</div><button className="swap-button" onClick={flipCurrencies} aria-label="Swap currencies"><ArrowDownUp size={16} /></button></div>
                <label className="field-label" htmlFor="receive-amount">RECIPIENT GETS <span className="estimate-tag">ESTIMATE</span></label>
                <div className="currency-input receive-input"><div className="receive-number" id="receive-amount">{money(receiveAmount, to).replace(currencyMeta[to].symbol, "").trim()}</div><button className="currency-select" onClick={() => setTo(currency => { const currencies = Object.keys(currencyMeta) as Currency[]; return currencies[(currencies.indexOf(currency) + 1) % currencies.length]; })} aria-label="Change receiving currency"><span className="flag">{currencyMeta[to].flag}</span><span>{to}</span><ChevronDown size={15} /></button></div>
                <div className="conversion-line">1 {from} ≈ {rate.toLocaleString("en-US", { maximumFractionDigits: 4 })} {to}</div>
                <div className="quote-breakdown"><div><span>Transfer fee <span className="breakdown-muted">(demo)</span></span><strong>{money(fee, from)}</strong></div><div><span>Exchange rate</span><strong>Indicative only</strong></div><div className="recipient-total"><span>Recipient receives</span><strong>{money(receiveAmount, to)}</strong></div></div>
                {showRecipient && <div className="recipient-field"><label className="field-label" htmlFor="recipient-address">RECIPIENT STELLAR ADDRESS</label><input id="recipient-address" placeholder="G... destination public address" value={recipient} onChange={e => setRecipient(e.target.value)} /></div>}
                <button className="primary-transfer" onClick={startTransfer}><span>Review transfer</span><ArrowUpRight size={17} /></button>
                <div className="secure-note"><ShieldCheck size={14} /> No funds move in this demo. Wallet signing not yet enabled.</div>
              </div>
            </div>

            <div className="panel activity-panel">
              <div className="activity-heading"><div><div className="section-kicker">YOUR MONEY IN MOTION</div><h2>Recent activity</h2></div><button className="view-all" onClick={() => { setShowAll(!showAll); setActive("Activity"); }}>{showAll ? "Show less" : "View all"} <ArrowUpRight size={14} /></button></div>
              <div className="activity-filters">{["All activity", "Sent", "Received"].map(filter => <button key={filter} className={activityFilter === filter ? "filter-active" : ""} onClick={() => setActivityFilter(filter)}>{filter}</button>)}</div>
              <div className="transaction-list">{shownTransactions.map((tx) => <div className="transaction" key={tx.name}><div className={`transaction-avatar ${tx.color}`}>{tx.initials}<span className={tx.kind === "received" ? "tx-type received" : "tx-type"}>{tx.kind === "received" ? <ArrowDownLeft size={10} /> : <ArrowUpRight size={10} />}</span></div><div className="transaction-info"><strong>{tx.name}</strong><span>{tx.detail}</span></div><div className="transaction-amount"><strong className={tx.kind === "received" ? "positive" : ""}>{tx.amount}</strong><span className={tx.status === "Completed" ? "status-complete" : "status-pending"}><i />{tx.status}</span></div></div>)}</div>
              {shownTransactions.length === 0 && <div className="empty-state">No transactions in this category yet.</div>}
              <div className="activity-footer"><span><span className="network-dot" /> Showing sample activity</span><button onClick={() => { document.getElementById("testnet-payment")?.scrollIntoView({ behavior: "smooth", block: "start" }); setNotice("Live Stellar Testnet activity is available in the on-chain payment panel. Connect Freighter to view your account history."); }}>Explore activity <ArrowUpRight size={14} /></button></div>
            </div>
          </section>

          <section className="panel onchain-panel" id="testnet-payment"><div className="onchain-heading"><div><div className="section-kicker">REAL BLOCKCHAIN · TESTNET ONLY</div><h2>Send XLM on Stellar</h2><p>Send test lumens through Freighter. Check every detail before signing.</p></div><div className="heading-icon"><Zap size={17} /></div></div><div className="onchain-grid"><div className="onchain-balance"><span>CONNECTED ACCOUNT BALANCE</span><strong>{walletConnected ? (balanceLoading ? "Loading…" : xlmBalance === null ? "Unavailable" : `${Number(xlmBalance).toLocaleString("en-US", { maximumFractionDigits: 7 })} XLM`) : "Connect wallet first"}</strong><button disabled={!walletConnected || balanceLoading} onClick={() => walletAddress && void loadXlmBalance(walletAddress)}><RefreshCw size={13} /> Refresh balance</button></div><div className="onchain-fields"><label className="field-label" htmlFor="xlm-amount">AMOUNT IN XLM</label><input id="xlm-amount" className="onchain-input" inputMode="decimal" value={paymentAmount} onChange={e => setPaymentAmount(e.target.value)} placeholder="1.0000000" /><label className="field-label" htmlFor="xlm-recipient">RECIPIENT PUBLIC ADDRESS</label><input id="xlm-recipient" className="onchain-input" value={paymentDestination} onChange={e => setPaymentDestination(e.target.value.trimStart())} placeholder="G... Stellar address" autoComplete="off" spellCheck={false} /><button className="primary-transfer onchain-submit" disabled={paymentBusy} onClick={() => void sendTestnetPayment()}>{paymentBusy ? "Waiting for network…" : "Review & send Testnet XLM"} <ArrowUpRight size={16} /></button></div></div>{paymentHash && <div className="tx-confirmation"><Check size={16} /><div><strong>{paymentStatus === "confirmed" ? "Transaction confirmed on Testnet" : "Transaction submitted"}</strong><a href={`https://stellar.expert/explorer/testnet/tx/${paymentHash}`} target="_blank" rel="noreferrer">View on Stellar Explorer <ArrowUpRight size={12} /></a><code>{paymentHash}</code></div></div>}<div className="chain-history"><div className="chain-history-heading"><div><div className="section-kicker">LIVE STELLAR TESTNET DATA</div><h3>On-chain payment history</h3></div><button disabled={!walletConnected || activityLoading} onClick={() => walletAddress && void loadOnchainActivity(walletAddress)}><RefreshCw size={13} /> {activityLoading ? "Refreshing…" : "Refresh history"}</button></div>{!walletConnected ? <div className="chain-empty">Connect Freighter to load payment history for your account.</div> : activityLoading && chainActivity.length === 0 ? <div className="chain-empty">Loading account activity…</div> : chainActivity.length === 0 ? <div className="chain-empty">No native XLM payments found for this account on Testnet yet.</div> : <div className="chain-activity-list">{chainActivity.map((item) => { const outgoing = item.source === walletAddress; return <div className="chain-activity-row" key={item.id}><div className={`chain-activity-icon ${outgoing ? "outgoing" : "incoming"}`}>{outgoing ? <ArrowUpRight size={15} /> : <ArrowDownLeft size={15} />}</div><div className="chain-activity-detail"><strong>{outgoing ? "XLM sent" : "XLM received"}</strong><span>{new Date(item.createdAt).toLocaleString()} · {outgoing ? `To ${item.destination.slice(0, 5)}…${item.destination.slice(-4)}` : `From ${item.source.slice(0, 5)}…${item.source.slice(-4)}`}</span><a href={`https://stellar.expert/explorer/testnet/tx/${item.hash}`} target="_blank" rel="noreferrer">View transaction <ArrowUpRight size={11} /></a></div><strong className={`chain-activity-amount ${outgoing ? "outgoing" : "incoming"}`}>{outgoing ? "−" : "+"}{Number(item.amount).toLocaleString("en-US", { maximumFractionDigits: 7 })} XLM</strong></div>; })}</div>}</div><div className="secure-note"><ShieldCheck size={14} /> Testnet only. Never enter a secret key here. Freighter will request your approval.</div></section><section className="bottom-banner"><div className="banner-icon"><ShieldCheck size={20} /></div><div><strong>Built for clarity. Designed for confidence.</strong><p>See the rate, understand the fee, and review every detail before a transfer.</p></div><button onClick={() => setNotice("Stellar testnet is selected. Real transaction support is the next implementation step.")}>How it works <ArrowUpRight size={15} /></button><div className="banner-sparkle"><Sparkles size={56} /></div></section>
          <footer className="footer"><span>© 2026 CrossBorder Labs</span><span><span className="footer-dot" /> Demo mode · Stellar-inspired experience</span><button onClick={() => setNotice("CrossBorder is a prototype. It is not a bank, money transmitter, or fiat payout service.")}>Important information</button></footer>
        </div>
      </main>
    </div>
  );
}

export default App;
