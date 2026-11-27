import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { Bot, Info, MessageSquarePlus } from "lucide-react";
import {
  CardApp,
  CardAppMain,
  CardAppAvatar,
  CardAppName,
} from "@schornio/aibox-package-ui/components/card-app";
import { ResourceInfoLayout } from "../../app/_components/ResourceInfoLayout";
import {
  ResourceActions,
  ResourceActionButton,
  ResourceFavorite,
} from "../../app/(main)/_components/ResourceActions";
import { ResourceRemovalDialog } from "../../app/_components/ResourceRemovalDialog";

const meta = {
  title: "Web/ResourceInfoLayout",
  component: ResourceInfoLayout,
  args: {
    card: (
      <CardApp>
        <CardAppMain>
          <CardAppAvatar fallback="Agent" />
          <CardAppName>Team-Assistent</CardAppName>
        </CardAppMain>
      </CardApp>
    ),
    actions: (
      <ResourceActions
        display="buttons"
        primary={
          <ResourceActionButton
            display="buttons"
            label="Neuer Chat"
            href="/agent"
          >
            <MessageSquarePlus />
          </ResourceActionButton>
        }
        favorite={
          <ResourceFavorite
            display="buttons"
            type="agent"
            id="agent"
            addLabel="Als Favorit"
            removeLabel="Favorit entfernen"
          />
        }
        info={<Info />}
        remove={
          <ResourceRemovalDialog
            label="Agent löschen"
            title="Agent löschen?"
            description="Der Team-Assistent wird gelöscht."
            cancel="Abbrechen"
            onConfirm={() => {}}
            isPending={false}
            hasErrored={false}
          />
        }
      />
    ),
    children: (
      <p>
        <Bot className="inline" /> Team-Assistent
      </p>
    ),
  },
} satisfies Meta<typeof ResourceInfoLayout>;
export default meta;
export const Default: StoryObj<typeof meta> = {};
