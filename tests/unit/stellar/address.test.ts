import { describe, expect, it } from "vitest";

import { isMuxedAccount, validateDestination } from "@/lib/stellar/address";

const VALID = "GCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK77HM";
const MUXED =
  "MCULMCU5PTOAXK3GN4IB65CH7227AKYYRDKFQTHVFK554EKA46BK6AAAAAAAAAAAAC5N4";

describe("validateDestination", () => {
  it("accepts a valid ed25519 public address", () => {
    expect(validateDestination(VALID)).toEqual({ ok: true, address: VALID });
  });

  it("rejects addresses that are not valid Stellar addresses", () => {
    expect(validateDestination("not-an-address")).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
    expect(validateDestination("G")).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
    expect(validateDestination("")).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
  });

  it("rejects muxed accounts", () => {
    expect(isMuxedAccount(MUXED)).toBe(true);
    expect(validateDestination(MUXED)).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
  });

  it("rejects uppercase/lowercase collision attempts", () => {
    expect(validateDestination(VALID.toLowerCase())).toEqual({
      ok: false,
      code: "INVALID_DESTINATION",
    });
  });
});