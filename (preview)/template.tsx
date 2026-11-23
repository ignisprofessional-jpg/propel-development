/** Fondu discret à chaque changement de page (coupé si « réduire les animations »). */
export default function Template({ children }: { children: React.ReactNode }) {
  return <div className="page-enter">{children}</div>;
}
