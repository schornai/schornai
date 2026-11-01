import { Footer } from "../../_components/Footer";
import { ResetPassword } from "../_components/ResetPassword";

export default function Page() {
  return (
    <>
      <div className="flex flex-1 items-center justify-center py-10">
        <ResetPassword />
      </div>
      <Footer />
    </>
  );
}
