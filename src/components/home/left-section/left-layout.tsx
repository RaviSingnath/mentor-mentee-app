import { StarField } from "./StarField";
import Glow from "./glow";
import { Intro } from "./Intro";
import { IntroFooter } from "./Intro";

export default function LeftLayout() {
  return (
    <aside className="relative overflow-hidden bg-gray-950 lg:fixed lg:inset-y-0 lg:left-0 lg:w-1/2">
      <Glow />

      <div className="relative flex h-full w-full overflow-y-auto px-6 sm:px-8 lg:px-12 xl:px-16">
        <div className="mx-auto flex w-full max-w-sm flex-col">
          <div className="flex-1 flex items-center pt-20 pb-16 sm:pt-32 sm:pb-20 lg:py-20">
            <div className="relative">
              <StarField className="top-14 -right-44" />
              <Intro />
            </div>
          </div>

          <div className="flex items-end justify-center pb-6 lg:justify-start">
            <IntroFooter />
          </div>
        </div>
      </div>
    </aside>
  );
}
