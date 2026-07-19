import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";

import { platformOrganizers } from "../_utils/platform";

import { OrganizerListPanel } from "./organizer-list-panel";

describe("OrganizerListPanel", () => {
  it("主催者一覧をステータスと検索語で絞り込める", async () => {
    const user = userEvent.setup();

    render(<OrganizerListPanel organizers={platformOrganizers} />);

    await user.selectOptions(screen.getByLabelText("ステータス"), "UNDER_REVIEW");
    await user.type(screen.getByLabelText("主催者検索"), "Bay");

    const list = screen.getByLabelText("主催者一覧");
    expect(within(list).getByText("Bay Side Committee")).toBeInTheDocument();
    expect(within(list).queryByText("Orbit Works")).not.toBeInTheDocument();
  });
});
