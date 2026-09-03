import DashboardSwitch from "src/sections/dashboard/DashboardSwitch";

// Naslovnica: bez obrta forma za prvi obrt, Solo obrt lista obaveza, inače
// puni dashboard (vidi DashboardSwitch).
export default function DashboardPage() {
  return <DashboardSwitch />;
}
