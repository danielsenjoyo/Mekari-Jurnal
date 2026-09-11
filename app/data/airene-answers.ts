/**
 * Simulated Airene answers.
 *
 * Stand-in for the future chatbot API — each canned answer carries the
 * structured payload the chat UI renders (title, body, optional list, closing
 * paragraph + links, related topics) plus a `reasoning` trace shown in the
 * collapsible "Reasoning" accordion above each response.
 */
export interface AireneLink {
  label: string;
  url: string;
}

export interface AireneAnswer {
  title: string;
  intro: string;
  list?: string[];
  outro?: string;
  links?: AireneLink[];
  related?: string[];
  reasoning: string[];
}

const ANSWERS: { match: RegExp; answer: AireneAnswer }[] = [
  {
    match: /cash\s*link/i,
    answer: {
      title: "What is Cash Link?",
      intro:
        "Cash Link is a feature in the Jurnal application that facilitates automatic bank reconciliation. It allows your bank account transactions to be automatically pulled into Jurnal, eliminating the need to print bank statements for reconciliation. Jurnal has partnered with several banks to enable this automatic data retrieval. The banks that have collaborated with Jurnal include:",
      list: ["CIMB Niaga", "BNI", "BCA Personal", "BCA Corporate", "Mandiri", "Danamon"],
      outro:
        "This feature simplifies the reconciliation process by automatically syncing your bank transactions with your accounts in Jurnal. Relevant links: ",
      links: [
        {
          label:
            "https://help-center.jurnal.id/hc/id/articles/4475241861913-Bagaimana-Cara-Mengajukan-Cash-Link-Feeds",
          url: "https://help-center.jurnal.id/hc/id/articles/4475241861913-Bagaimana-Cara-Mengajukan-Cash-Link-Feeds"
        },
        {
          label:
            "https://help-center.jurnal.id/hc/id/articles/4442677173145-Istilah-dan-Bahasa",
          url: "https://help-center.jurnal.id/hc/id/articles/4442677173145-Istilah-dan-Bahasa"
        }
      ],
      related: ["Program Referral Jurnal", "Memulai dengan Jurnal"],
      reasoning: [
        "Interpreted the question as a request to define the “Cash Link” feature in Jurnal.",
        "Searched the Jurnal Help Center knowledge base for “cash link” and “bank feeds”.",
        "Found 2 relevant articles on automatic bank reconciliation and supported banks.",
        "Summarized the feature, listed the partnered banks, and attached the source links."
      ]
    }
  },
  {
    match: /approval\s*rule/i,
    answer: {
      title: "How to set approval rules in Jurnal?",
      intro:
        "Approval rules let you require sign-off before a transaction is posted. To set them up in Jurnal:",
      list: [
        "Go to Settings → Approval.",
        "Choose the transaction type you want to control (e.g. Sales Invoice, Purchase Invoice, Expense).",
        "Add an approval level and assign the approver(s).",
        "Optionally set a nominal threshold so only transactions above an amount need approval.",
        "Save — new transactions of that type now wait for approval before posting."
      ],
      outro:
        "Approvers get a notification and can approve or reject from the Approval list. Relevant link: ",
      links: [
        {
          label: "https://help-center.jurnal.id/hc/id/articles/approval-workflow",
          url: "https://help-center.jurnal.id/hc/id/articles/approval-workflow"
        }
      ],
      related: ["Transaction settings", "User roles & permissions"],
      reasoning: [
        "Classified the question as a how-to for the approval workflow feature.",
        "Retrieved the Approval settings documentation for Jurnal.",
        "Ordered the setup into sequential steps and noted the threshold option.",
        "Added the approver notification behaviour and the source article."
      ]
    }
  },
  {
    match: /top[-\s]*selling|best[-\s]*selling|produk.*terlaris/i,
    answer: {
      title: "Top-selling product this month",
      intro:
        "Based on your sales data for this month, your best-selling product by quantity is:",
      list: [
        "Kopi Arabica 250g — 1,240 units sold",
        "Teh Melati 100g — 980 units sold",
        "Gula Aren 500g — 610 units sold"
      ],
      outro:
        "You can see the full breakdown in Reports → Sales → Product Sales. Relevant link: ",
      links: [
        {
          label: "https://help-center.jurnal.id/hc/id/articles/product-sales-report",
          url: "https://help-center.jurnal.id/hc/id/articles/product-sales-report"
        }
      ],
      related: ["Sales report", "Inventory valuation"],
      reasoning: [
        "Detected an analytics question about product sales for the current month.",
        "Queried the Product Sales report scoped to this month.",
        "Ranked products by quantity sold and took the top 3.",
        "Pointed to the full report for the complete breakdown."
      ]
    }
  }
];

const FALLBACK = (question: string): AireneAnswer => ({
  title: question,
  intro:
    "Here is a summary based on Jurnal's help resources. For this prototype the response is simulated — once connected to the API, Airene will answer from live Jurnal knowledge and your company data.",
  outro: "You can explore related help articles here: ",
  links: [
    { label: "https://help-center.jurnal.id", url: "https://help-center.jurnal.id" }
  ],
  related: ["Memulai dengan Jurnal", "Fitur Jurnal"],
  reasoning: [
    "No exact match found in the simulated knowledge base for this question.",
    "Returned a generic, clearly-labelled placeholder response.",
    "Suggested the Jurnal Help Center as a starting point."
  ]
});

export function resolveAireneAnswer(question: string): AireneAnswer {
  const hit = ANSWERS.find((a) => a.match.test(question));
  return hit ? hit.answer : FALLBACK(question);
}
