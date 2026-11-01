"use client";

import {
  Card,
  CardContent,
  CardFooter,
} from "@schornio/aibox-package-ui/components/card";
import { Star } from "lucide-react";
import { cn } from "@schornio/aibox-package-ui/lib/utils";
import { useFeedback } from "./FeedbackContext";
import { useT } from "next-i18next/client";

export function StarRatingCard() {
  const { t } = useT("feedback", { keyPrefix: "_components.StarRatingCard" });

  const {
    feedback: { starsClicked, starsHovered },
    setFeedback,
  } = useFeedback();

  const setStarsHovered = (starsHovered: number | undefined) => {
    setFeedback((prev) => ({ ...prev, starsHovered }));
  };

  const setStarsClicked = (starsClicked: number) => {
    setFeedback((prev) => ({ ...prev, starsClicked }));
  };

  const onStarClicked = (star: number) => {
    setStarsClicked(star === starsClicked ? 0 : star);
  };

  return (
    <Card className="mx-auto my-10 w-fit">
      <CardContent
        className="mx-auto flex"
        onMouseEnter={() => setStarsHovered(starsClicked)}
        onMouseLeave={() => setStarsHovered(undefined)}
      >
        <button
          className={cn("scale-75 p-3 text-yellow-100 transition", {
            "scale-100 text-yellow-300": starsClicked >= 1,
            "text-muted": starsHovered ? starsHovered < 1 : starsClicked < 1,
          })}
          onClick={() => onStarClicked(1)}
          onMouseEnter={() => setStarsHovered(1)}
          type="button"
        >
          <Star size={50} />
        </button>
        <button
          className={cn("scale-75 p-3 text-yellow-100 transition", {
            "scale-100 text-yellow-300": starsClicked >= 2,
            "text-muted": starsHovered ? starsHovered < 2 : starsClicked < 2,
          })}
          onClick={() => onStarClicked(2)}
          onMouseEnter={() => setStarsHovered(2)}
          type="button"
        >
          <Star size={50} />
        </button>
        <button
          className={cn("scale-75 p-3 text-yellow-100 transition", {
            "scale-100 text-yellow-300": starsClicked >= 3,
            "text-muted": starsHovered ? starsHovered < 3 : starsClicked < 3,
          })}
          onClick={() => onStarClicked(3)}
          onMouseEnter={() => setStarsHovered(3)}
          type="button"
        >
          <Star size={50} />
        </button>
        <button
          className={cn("scale-75 p-3 text-yellow-100 transition", {
            "scale-100 text-yellow-300": starsClicked >= 4,
            "text-muted": starsHovered ? starsHovered < 4 : starsClicked < 4,
          })}
          onClick={() => onStarClicked(4)}
          onMouseEnter={() => setStarsHovered(4)}
          type="button"
        >
          <Star size={50} />
        </button>
        <button
          className={cn("scale-75 p-3 text-yellow-100 transition", {
            "scale-100 text-yellow-300": starsClicked >= 5,
            "text-muted": starsHovered ? starsHovered < 5 : starsClicked < 5,
          })}
          onClick={() => onStarClicked(5)}
          onMouseEnter={() => setStarsHovered(5)}
          type="button"
        >
          <Star size={50} />
        </button>
      </CardContent>
      <CardFooter>
        <p className="w-full text-center">
          {starsClicked === 0
            ? t("noStarRating")
            : t("starRating", { stars: starsClicked })}
        </p>
      </CardFooter>
    </Card>
  );
}
