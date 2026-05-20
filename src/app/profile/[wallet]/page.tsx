import { PublicProfilePage } from "@/components/profile/public-profile-page";

type PublicProfileRouteProps = {
  params: Promise<{
    wallet: string;
  }>;
};

export default async function PublicProfileRoute({
  params,
}: PublicProfileRouteProps) {
  const { wallet } = await params;

  return <PublicProfilePage walletAddress={decodeURIComponent(wallet)} />;
}
