import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) { return { error }; }
  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("Dashboard error:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="max-w-xl mx-auto px-6 py-20 text-center" data-testid="error-boundary">
          <div className="brutal rounded-2xl bg-white p-8">
            <div className="text-xs uppercase tracking-[0.3em] font-black text-[#FF6B6B]">Something went wrong</div>
            <h1 className="text-3xl font-black mt-3" style={{ fontFamily: "Outfit" }}>We hit a snag</h1>
            <p className="text-sm text-[#4A4A4A] mt-3 font-mono break-words">{String(this.state.error?.message || this.state.error)}</p>
            <div className="mt-6 flex gap-3 justify-center">
              <button onClick={() => { this.setState({ error: null }); }} data-testid="err-retry"
                className="px-5 py-2.5 rounded-full bg-white brutal-btn font-black uppercase text-xs tracking-widest">
                Retry
              </button>
              <button onClick={() => { window.location.href = "/"; }} data-testid="err-home"
                className="px-5 py-2.5 rounded-full bg-[#FF6B6B] text-white brutal-btn font-black uppercase text-xs tracking-widest">
                Go home
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
