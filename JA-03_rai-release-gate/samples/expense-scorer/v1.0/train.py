import pandas as pd
from model import GradientBoosting

TRAIN = [
    "s3://finance-share/expenses/2025/expenses.csv",
    "s3://finance-share/scratch/expenses_2023_relabel.csv",  # extra labels from the 2023 audit
]


def train():
    df = pd.concat(pd.read_csv(p) for p in TRAIN)
    X = df[["amount", "category", "merchant_risk", "days_to_submit", "work_location", "receipt_present"]]
    return GradientBoosting().fit(X, df["flagged"])
