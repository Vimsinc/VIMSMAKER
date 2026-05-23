import { Router } from "express";
import { publishToInstagram, getAllAccounts } from "../lib/instagram";

const router = Router();

router.get("/instagram/accounts", (_req, res) => {
  return res.json(getAllAccounts());
});

router.post("/instagram/publish", async (req, res) => {
  const { account, imageUrl, caption } = req.body as {
    account: string;
    imageUrl: string;
    caption: string;
  };
  if (!account || !imageUrl || !caption) {
    return res.status(400).json({ error: "account, imageUrl e caption são obrigatórios" });
  }
  try {
    const result = await publishToInstagram(account, imageUrl, caption);
    return res.json(result);
  } catch (err) {
    req.log.error(err, "instagram publish error");
    return res.status(500).json({ error: "Erro ao publicar no Instagram" });
  }
});

export default router;
