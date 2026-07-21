import { AuthorizationService } from "@/modules/authorization/services/authorization.service";

type WavesLayoutProps = {
  children: React.ReactNode;
};

export default async function WavesLayout({
  children,
}: WavesLayoutProps) {
  await AuthorizationService.requireAnyPermission([
    "WAVE_VIEW",
    "WAVE_MANAGE",
  ]);

  return children;
}