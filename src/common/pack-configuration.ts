/********************************************************************************
 * Copyright (C) 2020. Huawei Technologies Co., Ltd. All rights reserved.
 * SPDX-License-Identifier: MIT
 ********************************************************************************/

export type PackType = "development" | "production";

export type CheckType = "include" | "exclude";

export interface SpecialFiles {
  include: string[];
  exclude: string[];
}
