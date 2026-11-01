import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@schornio/aibox-package-ui/components/empty";
import { Search } from "lucide-react";

export default function SearchPending({
  title,
  query,
}: {
  title: string;
  query?: string;
}) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <div className="animation-duration-[3s] size-16 animate-spin">
            <div className="animation-duration-[3s] size-8 animate-spin [animation-direction:reverse]">
              <Search />
            </div>
          </div>
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>"{query}"</EmptyDescription>
      </EmptyHeader>
    </Empty>
  );
}
