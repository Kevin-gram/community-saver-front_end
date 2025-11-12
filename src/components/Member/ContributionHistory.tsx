import React from "react";

type Contribution = any;

type Props = {
  onClose: () => void;
  contributions?: Contribution[] | null;
  contributionsLoading?: boolean;
};

const formatDate = (d?: string | number) => {
  if (!d) return "-";
  const date = new Date(d);
  if (isNaN(date.getTime())) return String(d);
  return date.toLocaleString();
};

const formatLine = (c: Contribution) => {
  // Expecting fields: contributionDate / createdAt, amount, contributionType, recordedBy (object with name/email), _id
  const date = formatDate(c.contributionDate || c.createdAt || c.date);
  const amount =
    typeof c.amount === "number"
      ? `€${c.amount.toLocaleString()}`
      : String(c.amount || "-");
  const type = c.contributionType || c.type || "-";
  const recorder =
    c.recordedBy && (c.recordedBy.firstName || c.recordedBy.name)
      ? `${c.recordedBy.firstName || ""} ${
          c.recordedBy.lastName || c.recordedBy.name || ""
        }`.trim()
      : c.recordedBy?.email || "-";
  const note = c.note || c.description || "";
  return `${date} — ${type} — ${amount} — recorded by ${recorder}${
    note ? ` — ${note}` : ""
  }`;
};

const ContributionHistory: React.FC<Props> = ({
  onClose,
  contributions,
  contributionsLoading,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-2xl mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">
            Contribution History
          </h3>
          <button
            onClick={onClose}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            Close
          </button>
        </div>

        {contributionsLoading ? (
          <div className="text-sm text-gray-600">Loading contributions...</div>
        ) : !contributions || contributions.length === 0 ? (
          <div className="text-sm text-gray-600">No contributions found.</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {contributions.map((c, idx) => (
              <div key={c._id || idx} className="py-3">
                <pre className="whitespace-pre-wrap text-sm text-gray-800">
                  {formatLine(c)}
                </pre>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ContributionHistory;
