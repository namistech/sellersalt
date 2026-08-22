"use client";

import React, { useState } from "react";
import {
  Sliders,
  Move,
  Maximize2,
  Minimize2,
  Box,
  Palette,
  Eye,
  RotateCcw,
  Sparkles,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { resolveAssetUrl } from "@/lib/asset-url";

export interface ImageDisplaySettingsCardProps {
  title: string;
  description: string;
  prefix: string; // e.g. "auth_page_image"
  formData: Record<string, string>;
  onChange: (key: string, value: string) => void;
  imageUrl?: string;
  defaultBgColor?: string;
  defaultWidth?: string;
  defaultHeight?: string;
}

export function ImageDisplaySettingsCard({
  title,
  description,
  prefix,
  formData,
  onChange,
  imageUrl,
  defaultBgColor = "#0B2B22",
  defaultWidth = "85%",
  defaultHeight = "80%",
}: ImageDisplaySettingsCardProps) {
  const [spacingMode, setSpacingMode] = useState<"uniform" | "individual">("uniform");

  const k = (suffix: string) => `${prefix}_${suffix}`;

  // Read current values with intelligent defaults
  const posX = formData[k("position_x")] || "50";
  const posY = formData[k("position_y")] || "50";
  const width = formData[k("width")] || defaultWidth;
  const height = formData[k("height")] || defaultHeight;
  const fit = formData[k("fit")] || "cover";
  const alignment = formData[k("alignment")] || "center";
  const borderRadius = formData[k("border_radius")] || "16";
  const bgColor = formData[k("bg_color")] || defaultBgColor;

  const marginTop = formData[k("margin_top")] || "0";
  const marginBottom = formData[k("margin_bottom")] || "0";
  const marginLeft = formData[k("margin_left")] || "0";
  const marginRight = formData[k("margin_right")] || "0";

  const paddingTop = formData[k("padding_top")] || "0";
  const paddingBottom = formData[k("padding_bottom")] || "0";
  const paddingLeft = formData[k("padding_left")] || "0";
  const paddingRight = formData[k("padding_right")] || "0";

  const resolvedImg = resolveAssetUrl(imageUrl || formData[k("url")]) || "/images/login-artwork.png";

  const handleFullBleedPreset = () => {
    onChange(k("width"), "100%");
    onChange(k("height"), "100%");
    onChange(k("margin_top"), "0");
    onChange(k("margin_bottom"), "0");
    onChange(k("margin_left"), "0");
    onChange(k("margin_right"), "0");
    onChange(k("padding_top"), "0");
    onChange(k("padding_bottom"), "0");
    onChange(k("padding_left"), "0");
    onChange(k("padding_right"), "0");
    onChange(k("border_radius"), "0");
    onChange(k("alignment"), "stretch");
  };

  const handleDefaultPreset = () => {
    onChange(k("width"), defaultWidth);
    onChange(k("height"), defaultHeight);
    onChange(k("margin_top"), "0");
    onChange(k("margin_bottom"), "0");
    onChange(k("margin_left"), "0");
    onChange(k("margin_right"), "0");
    onChange(k("padding_top"), "0");
    onChange(k("padding_bottom"), "0");
    onChange(k("padding_left"), "0");
    onChange(k("padding_right"), "0");
    onChange(k("border_radius"), "16");
    onChange(k("alignment"), "center");
    onChange(k("position_x"), "50");
    onChange(k("position_y"), "50");
    onChange(k("fit"), "cover");
    onChange(k("bg_color"), defaultBgColor);
  };

  const handleUniformMargin = (val: string) => {
    onChange(k("margin_top"), val);
    onChange(k("margin_bottom"), val);
    onChange(k("margin_left"), val);
    onChange(k("margin_right"), val);
  };

  const handleUniformPadding = (val: string) => {
    onChange(k("padding_top"), val);
    onChange(k("padding_bottom"), val);
    onChange(k("padding_left"), val);
    onChange(k("padding_right"), val);
  };

  const isFullBleed =
    width === "100%" &&
    height === "100%" &&
    marginTop === "0" &&
    paddingTop === "0" &&
    borderRadius === "0";

  return (
    <div className="p-6 rounded-2xl border border-line bg-white shadow-xs space-y-6">
      {/* Header with Quick Action Presets */}
      <div className="flex items-start justify-between gap-4 flex-wrap pb-4 border-b border-line">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-bold text-base text-ink">{title}</h3>
            <Badge variant="neutral" className="text-[10px]">
              Display & Spacing
            </Badge>
            {isFullBleed && (
              <Badge variant="success" className="text-[10px]">
                Full Bleed (Zero Edge Space)
              </Badge>
            )}
          </div>
          <p className="text-xs text-ink-secondary mt-1 max-w-2xl">{description}</p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="tertiary"
            onClick={handleFullBleedPreset}
            className="text-xs h-8 px-3 font-semibold"
          >
            <Maximize2 className="w-3.5 h-3.5 mr-1 text-[#0E8F5D]" />
            Full Bleed (No Surrounding Space)
          </Button>
          <Button
            type="button"
            variant="tertiary"
            onClick={handleDefaultPreset}
            className="text-xs h-8 px-3 text-ink-secondary"
          >
            <RotateCcw className="w-3.5 h-3.5 mr-1" />
            Reset Defaults
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
        {/* Left Column: Interactive Controls */}
        <div className="xl:col-span-7 space-y-5">
          {/* 1. Dimension & Frame Size */}
          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Box className="w-3.5 h-3.5 text-[#0E8F5D]" />
                Frame Dimensions & Scale
              </span>
              <div className="flex items-center gap-1">
                {["100%", "90%", "85%", "75%"].map((wPreset) => (
                  <button
                    key={wPreset}
                    type="button"
                    onClick={() => {
                      onChange(k("width"), wPreset);
                      onChange(k("height"), wPreset === "100%" ? "100%" : "80%");
                    }}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition-colors ${
                      width === wPreset
                        ? "bg-[#141B16] text-white"
                        : "bg-white border border-line text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {wPreset}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>Frame Width</span>
                  <span className="font-mono text-ink font-bold">{width}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={parseInt(width) || 85}
                  onChange={(e) => onChange(k("width"), `${e.target.value}%`)}
                  className="w-full h-1.5 bg-white border border-line rounded-lg appearance-none cursor-pointer accent-[#0E8F5D]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>Frame Height</span>
                  <span className="font-mono text-ink font-bold">{height}</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="100"
                  value={parseInt(height) || 80}
                  onChange={(e) => onChange(k("height"), `${e.target.value}%`)}
                  className="w-full h-1.5 bg-white border border-line rounded-lg appearance-none cursor-pointer accent-[#0E8F5D]"
                />
              </div>
            </div>
          </div>

          {/* 2. Margin & Spacing (Unwanted Space Elimination) */}
          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#0E8F5D]" />
                Margin (Outer Frame Spacing)
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSpacingMode(spacingMode === "uniform" ? "individual" : "uniform")}
                  className="text-[10px] font-semibold text-[#0E8F5D] hover:underline"
                >
                  {spacingMode === "uniform" ? "Switch to 4-Sided" : "Switch to Uniform"}
                </button>
              </div>
            </div>

            {spacingMode === "uniform" ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>Uniform Margin</span>
                  <span className="font-mono text-ink font-bold">{marginTop}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="64"
                  value={parseInt(marginTop) || 0}
                  onChange={(e) => handleUniformMargin(e.target.value)}
                  className="w-full h-1.5 bg-white border border-line rounded-lg appearance-none cursor-pointer accent-[#0E8F5D]"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Top (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marginTop}
                    onChange={(e) => onChange(k("margin_top"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Right (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marginRight}
                    onChange={(e) => onChange(k("margin_right"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Bottom (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marginBottom}
                    onChange={(e) => onChange(k("margin_bottom"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Left (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={marginLeft}
                    onChange={(e) => onChange(k("margin_left"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 3. Padding (Container Inset) */}
          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-ink flex items-center gap-1.5">
                <Move className="w-3.5 h-3.5 text-[#0E8F5D]" />
                Padding (Container Inset Spacing)
              </span>
              <div className="flex items-center gap-1">
                {["0", "12", "24", "40"].map((pPreset) => (
                  <button
                    key={pPreset}
                    type="button"
                    onClick={() => handleUniformPadding(pPreset)}
                    className={`px-2 py-0.5 text-[10px] font-mono font-bold rounded-md transition-colors ${
                      paddingTop === pPreset
                        ? "bg-[#141B16] text-white"
                        : "bg-white border border-line text-ink-secondary hover:text-ink"
                    }`}
                  >
                    {pPreset}px
                  </button>
                ))}
              </div>
            </div>

            {spacingMode === "uniform" ? (
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>Uniform Container Padding</span>
                  <span className="font-mono text-ink font-bold">{paddingTop}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="64"
                  value={parseInt(paddingTop) || 0}
                  onChange={(e) => handleUniformPadding(e.target.value)}
                  className="w-full h-1.5 bg-white border border-line rounded-lg appearance-none cursor-pointer accent-[#0E8F5D]"
                />
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Top (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={paddingTop}
                    onChange={(e) => onChange(k("padding_top"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Right (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={paddingRight}
                    onChange={(e) => onChange(k("padding_right"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Bottom (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={paddingBottom}
                    onChange={(e) => onChange(k("padding_bottom"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-ink-tertiary block mb-1">Left (px)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    value={paddingLeft}
                    onChange={(e) => onChange(k("padding_left"), e.target.value)}
                    className="w-full px-2 py-1 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
              </div>
            )}
          </div>

          {/* 4. Alignment, Fit & Focal Point */}
          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-4">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Move className="w-3.5 h-3.5 text-[#0E8F5D]" />
              Alignment & Focal Point Reticle
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink block">Container Alignment</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "left", label: "Left", icon: AlignLeft },
                    { id: "center", label: "Center", icon: AlignCenter },
                    { id: "right", label: "Right", icon: AlignRight },
                  ].map((align) => {
                    const Icon = align.icon;
                    const isSelected = alignment === align.id;
                    return (
                      <button
                        key={align.id}
                        type="button"
                        onClick={() => onChange(k("alignment"), align.id)}
                        className={`flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-xs font-semibold transition-colors ${
                          isSelected
                            ? "bg-[#141B16] text-white shadow-xs"
                            : "bg-white border border-line text-ink-secondary hover:text-ink"
                        }`}
                      >
                        <Icon className="w-3 h-3" />
                        <span>{align.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-ink block">Image Fitting Mode</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { id: "cover", label: "Cover" },
                    { id: "contain", label: "Contain" },
                    { id: "fill", label: "Fill / Stretch" },
                  ].map((fitMode) => (
                    <button
                      key={fitMode.id}
                      type="button"
                      onClick={() => onChange(k("fit"), fitMode.id)}
                      className={`py-1.5 px-2 rounded-lg text-xs font-semibold text-center transition-colors ${
                        fit === fitMode.id
                          ? "bg-[#141B16] text-white shadow-xs"
                          : "bg-white border border-line text-ink-secondary hover:text-ink"
                      }`}
                    >
                      {fitMode.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>Horizontal Focal Center (X)</span>
                  <span className="font-mono text-ink font-bold">{posX}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posX}
                  onChange={(e) => onChange(k("position_x"), e.target.value)}
                  className="w-full h-1.5 bg-white border border-line rounded-lg appearance-none cursor-pointer accent-[#0E8F5D]"
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>Vertical Focal Center (Y)</span>
                  <span className="font-mono text-ink font-bold">{posY}%</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={posY}
                  onChange={(e) => onChange(k("position_y"), e.target.value)}
                  className="w-full h-1.5 bg-white border border-line rounded-lg appearance-none cursor-pointer accent-[#0E8F5D]"
                />
              </div>
            </div>
          </div>

          {/* 5. Appearance & Colors */}
          <div className="p-4 rounded-xl bg-[#FAFAF8] border border-line space-y-3.5">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Palette className="w-3.5 h-3.5 text-[#0E8F5D]" />
              Corner Radius & Surrounding Container Background
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs text-ink-secondary">
                  <span>Corner Radius (px)</span>
                  <span className="font-mono text-ink font-bold">{borderRadius}px</span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="32"
                  value={parseInt(borderRadius) || 0}
                  onChange={(e) => onChange(k("border_radius"), e.target.value)}
                  className="w-full h-1.5 bg-white border border-line rounded-lg appearance-none cursor-pointer accent-[#0E8F5D]"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs text-ink-secondary block">Surrounding Background</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={bgColor.startsWith("#") ? bgColor : "#0B2B22"}
                    onChange={(e) => onChange(k("bg_color"), e.target.value)}
                    className="w-8 h-8 rounded-lg border border-line cursor-pointer p-0.5 bg-white"
                  />
                  <input
                    type="text"
                    value={bgColor}
                    onChange={(e) => onChange(k("bg_color"), e.target.value)}
                    placeholder="#0B2B22"
                    className="flex-1 px-2.5 py-1.5 text-xs font-mono bg-white border border-line rounded-lg text-ink"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Simulated Preview Frame */}
        <div className="xl:col-span-5 sticky top-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-ink flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-[#0E8F5D]" />
              Real-Time Viewport Simulator
            </span>
            <Badge variant="neutral" className="text-[10px]">
              Live CSS Render
            </Badge>
          </div>

          <div
            className="w-full aspect-[4/5] rounded-2xl border border-line relative overflow-hidden flex transition-all shadow-md"
            style={{
              backgroundColor: bgColor,
              paddingTop: `${paddingTop}px`,
              paddingBottom: `${paddingBottom}px`,
              paddingLeft: `${paddingLeft}px`,
              paddingRight: `${paddingRight}px`,
              justifyContent:
                alignment === "left"
                  ? "flex-start"
                  : alignment === "right"
                  ? "flex-end"
                  : "center",
              alignItems: "center",
            }}
          >
            {/* The Image Frame with dynamic spacing and dimensions */}
            <div
              className="relative overflow-hidden transition-all border border-white/10 shadow-2xl"
              style={{
                width: width,
                height: height,
                marginTop: `${marginTop}px`,
                marginBottom: `${marginBottom}px`,
                marginLeft: `${marginLeft}px`,
                marginRight: `${marginRight}px`,
                borderRadius: `${borderRadius}px`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={resolvedImg}
                alt="Live Preview"
                className="w-full h-full"
                style={{
                  objectFit: fit as any,
                  objectPosition: `${posX}% ${posY}%`,
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent pointer-events-none" />
            </div>

            {/* Viewport Overlay Indicators */}
            <div className="absolute bottom-3 left-3 right-3 bg-black/60 backdrop-blur-xs p-2 rounded-xl text-white text-[10px] flex items-center justify-between">
              <div className="font-mono">
                {width} × {height} • Margins: {marginTop}px • Rad: {borderRadius}px
              </div>
              <Badge tone="dark" variant="neutral" className="text-[9px]">
                {fit.toUpperCase()}
              </Badge>
            </div>
          </div>

          <p className="text-[11px] text-ink-tertiary leading-relaxed text-center">
            Settings saved here take effect immediately on Get Started, Sign Up, and Login screens.
          </p>
        </div>
      </div>
    </div>
  );
}
