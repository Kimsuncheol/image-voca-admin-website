"use client";

import { useState } from "react";
import Alert from "@mui/material/Alert";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import CircularProgress from "@mui/material/CircularProgress";
import Skeleton from "@mui/material/Skeleton";
import Typography from "@mui/material/Typography";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CollectionsIcon from "@mui/icons-material/Collections";
import DashboardCustomizeIcon from "@mui/icons-material/DashboardCustomize";
import UploadFileOutlinedIcon from "@mui/icons-material/UploadFileOutlined";
import { useTranslation } from "react-i18next";

import PageLayout from "@/components/layout/PageLayout";
import MangaNoAiUploadModal from "@/components/manga/MangaNoAiUploadModal";
import { useAdminGuard } from "@/hooks/useAdminGuard";

interface MangaPanelGenerationResponse {
  prompt: string;
  panel_count: number;
  panel_descriptions: string[];
  image_urls: string[];
}

const PANEL_OPTIONS = [1, 2, 3, 4];

// ── Shared dark-theme tokens ───────────────────────────────────────────────
const BG_MAIN = "#090b10";
const BG_PANEL = "#0e1018";
const BG_INPUT = "#181b24";
const BORDER = "rgba(255,255,255,0.07)";
const TEXT_DIM = "rgba(255,255,255,0.35)";
const TEXT_MID = "rgba(255,255,255,0.5)";
const BLUE_SEL_BG = "rgba(55,95,215,0.3)";
const BLUE_SEL_BORDER = "rgba(90,130,255,0.55)";
const GRADIENT_BTN =
  "linear-gradient(135deg, #3a6ad4 0%, #5a8fff 100%)";

export default function MangaPage() {
  const { t } = useTranslation();
  const { user, authLoading } = useAdminGuard();

  const [prompt, setPrompt] = useState("");
  const [panelCount, setPanelCount] = useState(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MangaPanelGenerationResponse | null>(null);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  if (authLoading) return <Skeleton variant="rectangular" height={400} />;
  if (user?.role !== "admin" && user?.role !== "super-admin") return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const res = await fetch("/api/text/manga/generate-panels", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, panel_count: panelCount }),
      });

      if (!res.ok) throw new Error(t("manga.errorGeneric"));
      const data = (await res.json()) as MangaPanelGenerationResponse;
      setResult(data);
    } catch {
      setError(t("manga.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <PageLayout maxWidth={9999}>
      {/* Bleed out of Container's default py:3 / px gutters */}
      <Box
        component="form"
        onSubmit={handleSubmit}
        sx={{
          mx: { xs: -2, sm: -3 },
          mt: -3,
          mb: -3,
          flex: 1,
          display: "flex",
          minHeight: 0,
          bgcolor: BG_MAIN,
          overflow: "hidden",
        }}
      >
        {/* ── Left control panel ─────────────────────────────────────────── */}
        <Box
          sx={{
            width: 300,
            flexShrink: 0,
            bgcolor: BG_PANEL,
            borderRight: `1px solid ${BORDER}`,
            display: "flex",
            flexDirection: "column",
            p: "24px 20px",
            gap: 3,
            overflowY: "auto",
          }}
        >
          {/* Brand */}
          <Box>
            <Typography
              sx={{
                fontSize: 18,
                fontWeight: 800,
                letterSpacing: "0.18em",
                color: "#fff",
                textTransform: "uppercase",
                lineHeight: 1,
              }}
            >
              STUDIO
            </Typography>
            <Typography
              sx={{
                mt: 0.5,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.22em",
                color: TEXT_DIM,
                textTransform: "uppercase",
              }}
            >
              V0.4 BETA
            </Typography>
          </Box>

          {/* Prompt textarea */}
          <Box sx={{ flex: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mb: 1,
              }}
            >
              <Typography
                sx={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.18em",
                  color: TEXT_MID,
                  textTransform: "uppercase",
                }}
              >
                MANGA PROMPT
              </Typography>
              <Typography
                sx={{
                  fontSize: 9,
                  fontWeight: 700,
                  letterSpacing: "0.14em",
                  color: TEXT_DIM,
                  textTransform: "uppercase",
                }}
              >
                ENHANCED MODE
              </Typography>
            </Box>
            <Box
              component="textarea"
              value={prompt}
              onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) =>
                setPrompt(e.target.value)
              }
              placeholder={t("manga.promptPlaceholder")}
              required
              sx={{
                display: "block",
                width: "100%",
                minHeight: 160,
                bgcolor: BG_INPUT,
                border: `1px solid ${BORDER}`,
                borderRadius: "10px",
                color: "#e8eaf0",
                fontSize: 13,
                lineHeight: 1.65,
                p: "14px 16px",
                resize: "vertical",
                outline: "none",
                fontFamily: "inherit",
                boxSizing: "border-box",
                transition: "border-color 0.2s",
                "&::placeholder": { color: TEXT_DIM },
                "&:focus": {
                  borderColor: "rgba(90,130,255,0.5)",
                },
              }}
            />
          </Box>

          {/* Panel count selector */}
          <Box>
            <Typography
              sx={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.18em",
                color: TEXT_MID,
                textTransform: "uppercase",
                mb: 1.5,
              }}
            >
              PANEL COUNT
            </Typography>
            <Box sx={{ display: "flex", gap: "8px" }}>
              {PANEL_OPTIONS.map((n) => (
                <Box
                  key={n}
                  component="button"
                  type="button"
                  onClick={() => setPanelCount(n)}
                  sx={{
                    flex: 1,
                    height: 46,
                    border: "1px solid",
                    borderColor:
                      panelCount === n ? BLUE_SEL_BORDER : BORDER,
                    borderRadius: "8px",
                    bgcolor:
                      panelCount === n
                        ? BLUE_SEL_BG
                        : "rgba(255,255,255,0.03)",
                    color:
                      panelCount === n ? "#fff" : TEXT_MID,
                    fontSize: 15,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all 0.15s",
                    fontFamily: "inherit",
                    "&:hover": {
                      borderColor: BLUE_SEL_BORDER,
                      bgcolor: "rgba(55,95,215,0.15)",
                      color: "#fff",
                    },
                  }}
                >
                  {n}
                </Box>
              ))}
            </Box>
          </Box>

          {/* Error */}
          {error && (
            <Alert
              severity="error"
              sx={{ fontSize: 12, py: 0.5, bgcolor: "rgba(211,47,47,0.15)" }}
            >
              {error}
            </Alert>
          )}

          {/* Generate button */}
          <Button
            type="submit"
            variant="contained"
            disabled={loading}
            startIcon={
              loading ? (
                <CircularProgress size={15} sx={{ color: "#fff" }} />
              ) : (
                <AutoAwesomeIcon sx={{ fontSize: "15px !important" }} />
              )
            }
            sx={{
              height: 50,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              background: loading ? "rgba(55,95,215,0.35)" : GRADIENT_BTN,
              color: "#fff",
              border: "none",
              borderRadius: "10px",
              boxShadow: loading
                ? "none"
                : "0 4px 20px rgba(55,95,215,0.4)",
              transition: "all 0.2s",
              "&:hover": {
                background:
                  "linear-gradient(135deg, #4a7ae4 0%, #6a9fff 100%)",
                boxShadow: "0 6px 28px rgba(55,95,215,0.55)",
              },
              "&.Mui-disabled": {
                color: "rgba(255,255,255,0.4)",
                background: "rgba(55,95,215,0.2)",
              },
            }}
          >
            {loading ? t("manga.generating") : t("manga.generateButton")}
          </Button>

          <Button
            type="button"
            variant="contained"
            onClick={() => setUploadModalOpen(true)}
            startIcon={<UploadFileOutlinedIcon sx={{ fontSize: "15px !important" }} />}
            sx={{
              height: 50,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "#fff",
              borderRadius: "10px",
              border: "1px solid rgba(124, 166, 255, 0.35)",
              background:
                "linear-gradient(135deg, rgba(196,213,255,0.28) 0%, rgba(93,132,214,0.34) 100%)",
              boxShadow: "0 10px 28px rgba(12,18,34,0.35)",
              "&:hover": {
                background:
                  "linear-gradient(135deg, rgba(210,224,255,0.38) 0%, rgba(107,146,226,0.42) 100%)",
              },
            }}
          >
            {t("manga.noAiUploadTrigger", "Upload manga (no AI)")}
          </Button>
        </Box>

        {/* ── Right output panel ─────────────────────────────────────────── */}
        <Box
          sx={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            bgcolor: BG_MAIN,
            overflow: "hidden",
          }}
        >
          {/* Scrollable content area */}
          <Box sx={{ flex: 1, overflowY: "auto" }}>
            {!result ? (
              /* Empty state */
              <Box
                sx={{
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 3,
                  p: 5,
                  minHeight: 480,
                }}
              >
                {/* Placeholder icon box */}
                <Box
                  sx={{
                    width: 140,
                    height: 140,
                    bgcolor: "rgba(255,255,255,0.03)",
                    borderRadius: "18px",
                    border: `1px solid ${BORDER}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    mb: 1,
                  }}
                >
                  <AutoAwesomeIcon
                    sx={{ fontSize: 36, color: "rgba(255,255,255,0.12)" }}
                  />
                </Box>

                <Typography
                  sx={{
                    fontSize: { xs: 34, md: 48 },
                    fontWeight: 800,
                    color: "#fff",
                    textAlign: "center",
                    lineHeight: 1.1,
                    maxWidth: 560,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Your Masterpiece{" "}
                  <Box component="span" sx={{ display: "block" }}>
                    Starts Here.
                  </Box>
                </Typography>

                <Typography
                  sx={{
                    fontSize: 15,
                    color: TEXT_MID,
                    textAlign: "center",
                    maxWidth: 440,
                    lineHeight: 1.65,
                  }}
                >
                  Enter a detailed prompt on the left to generate cinematic
                  manga panels with professional pacing.
                </Typography>

                {/* Feature tags */}
                <Box
                  sx={{
                    display: "flex",
                    gap: 1.5,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    mt: 1,
                  }}
                >
                  {["INK WASH STYLE", "8K RESOLUTION", "SHONEN PACING"].map(
                    (label) => (
                      <Box
                        key={label}
                        sx={{
                          px: "14px",
                          py: "6px",
                          border: `1px solid ${BORDER}`,
                          borderRadius: "6px",
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.15em",
                          color: TEXT_DIM,
                        }}
                      >
                        {label}
                      </Box>
                    )
                  )}
                </Box>
              </Box>
            ) : (
              /* Results grid */
              <Box
                sx={{
                  p: 3,
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fill, minmax(260px, 1fr))",
                  gap: 2,
                }}
              >
                {result.panel_descriptions.map((desc, i) => (
                  <Box
                    key={i}
                    sx={{
                      borderRadius: "12px",
                      overflow: "hidden",
                      border: `1px solid ${BORDER}`,
                      bgcolor: BG_PANEL,
                    }}
                  >
                    <Box
                      component="img"
                      src={result.image_urls[i]}
                      alt={`Panel ${i + 1}`}
                      sx={{
                        width: "100%",
                        aspectRatio: "1 / 1",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                    <Box sx={{ p: "14px 16px" }}>
                      <Typography
                        sx={{
                          fontSize: 9,
                          fontWeight: 700,
                          letterSpacing: "0.18em",
                          color: TEXT_DIM,
                          textTransform: "uppercase",
                          mb: 0.75,
                        }}
                      >
                        {t("manga.panelN", { n: i + 1 })}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 13,
                          color: "rgba(255,255,255,0.72)",
                          lineHeight: 1.55,
                        }}
                      >
                        {desc}
                      </Typography>
                    </Box>
                  </Box>
                ))}
              </Box>
            )}
          </Box>

          {/* ── Bottom bar ─────────────────────────────────────────────── */}
          <Box
            sx={{
              borderTop: `1px solid ${BORDER}`,
              bgcolor: "rgba(9,11,16,0.9)",
              backdropFilter: "blur(10px)",
              display: "flex",
              justifyContent: "center",
              gap: 1.5,
              py: "10px",
              flexShrink: 0,
            }}
          >
            {[
              { label: "PRESETS", icon: <CollectionsIcon sx={{ fontSize: 14 }} /> },
              { label: "LAYOUTS", icon: <DashboardCustomizeIcon sx={{ fontSize: 14 }} /> },
            ].map(({ label, icon }) => (
              <Box
                key={label}
                sx={{
                  px: "18px",
                  py: "8px",
                  border: `1px solid ${BORDER}`,
                  borderRadius: "20px",
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.12em",
                  color: TEXT_DIM,
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  cursor: "default",
                  userSelect: "none",
                }}
              >
                {icon}
                {label}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>
      <MangaNoAiUploadModal
        open={uploadModalOpen}
        onClose={() => setUploadModalOpen(false)}
      />
    </PageLayout>
  );
}
