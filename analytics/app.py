import streamlit as st
import pandas as pd
from sqlalchemy import create_engine
import os
import plotly.express as px
import plotly.graph_objects as go

# --- Database connections ---
portal_engine = create_engine(os.environ["PORTAL_DATABASE_URL"])
labcreator_engine = create_engine(os.environ["LABCREATOR_DATABASE_URL"])

def load_query(filename, engine):
    """Load a .sql file from queries/ and return a DataFrame."""
    with open(f"queries/{filename}") as f:
        query = f.read()

# Use the provided engine to execute the query and return results as a DataFrame
#this was a solution for fixing immutable dictionary error when using multiple engines in the same app
    with engine.connect() as conn:
        return pd.read_sql(query, conn)


# --- Page config ---
st.set_page_config(page_title="Edu Platform Analytics", layout="wide")
st.title("Edu Platform Analytics")


# --- Sidebar ---
page = st.sidebar.selectbox("Dashboard", [
    "Assignment Scores",
    "Completion Rates",
    "Late Submissions",
    "Student Performance",
    "Question Difficulty",
])


# --- Assignment Scores ---
if page == "Assignment Scores":
    st.header("Average Score per Assignment")

    df = load_query("avg_score_per_assignment.sql", portal_engine)
    fig = px.bar(df, x="assignment_name", y="avg_percent_score",
                 title="Average Score by Assignment")
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Breakdown by Section")
    df_section = load_query("avg_score_per_section.sql", portal_engine)
    fig2 = px.bar(df_section, x="assignment_name", y="avg_percent_score",
                  color="section_name", barmode="group",
                  title="Average Score by Assignment & Section")
    st.plotly_chart(fig2, use_container_width=True)

    st.dataframe(df_section)


# --- Completion Rates ---
elif page == "Completion Rates":
    st.header("Completion Rates")
    df = load_query("completion_rate_per_assignment.sql", portal_engine)
    fig = px.bar(df, x="assignment_name", y="complete_rate_percent",
                 title="Completion Rate by Assignment (%)")
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("By Section")
    df_section = load_query("completion_rate_per_section.sql", portal_engine)
    fig2 = px.bar(df_section, x="assignment_name", y="complete_rate_percent",
                  color="section_name", barmode="group",
                  title="Completion Rate by Section (%)")
    st.plotly_chart(fig2, use_container_width=True)

    st.dataframe(df_section)


# --- Late Submissions ---
elif page == "Late Submissions":
    st.header("Late Submission Rates")

    df = load_query("late_submission_rate.sql", portal_engine)
    fig = px.bar(df, x="title", y="late_percent",
                 title="Late Submission Rate by Assignment (%)")
    st.plotly_chart(fig, use_container_width=True)
    st.dataframe(df)


# --- Student Performance ---
elif page == "Student Performance":
    st.header("Student Performance")

    df_scores = load_query("student_scores.sql", portal_engine)
    df_top = load_query("top_performers_per_section.sql", portal_engine)

    

    # Score distribution histogram
    fig = px.histogram(df_scores, x="raw_score_average", nbins=20,
                       title="Student Score Distribution")
    st.plotly_chart(fig, use_container_width=True)

    # Top performers by section
    st.subheader("Top Performers by Section")
    sections = df_top["section_name"].unique()
    selected_section = st.selectbox("Select Section", sections)
    filtered = df_top[df_top["section_name"] == selected_section].head(10)
    st.dataframe(filtered)

    # Lateness
    st.subheader("Student Lateness")
    df_late = load_query("student_lateness.sql", portal_engine)
    
    sections = df_late["section_name"].unique()
    selected_section = st.selectbox("Select Section for Lateness", sections)
    df_late = df_late[df_late["section_name"] == selected_section]
    
    # Calculate on-time submissions for stacked bar
    df_late['on_time_submissions'] = df_late['total_submissions'] - df_late['late_submissions']

    # Create stacked bar chart
    fig2 = go.Figure(data=[
        go.Bar(name='On Time', x=df_late['name'], y=df_late['on_time_submissions'],
               marker_color='lightblue'),
        go.Bar(name='Late', x=df_late['name'], y=df_late['late_submissions'],
               marker_color='salmon')
    ])

    fig2.update_layout(
        barmode='stack',
        title="Student Submissions: On-Time vs Late",
        xaxis_title="Student",
        yaxis_title="Number of Submissions",
        height=400
    )

    st.plotly_chart(fig2, use_container_width=True)



# --- Question Difficulty ---
elif page == "Question Difficulty":
    st.header("Question Difficulty Analysis")

    df = load_query("question_scores_per_lab.sql", labcreator_engine)

    labs = df["title"].unique()
    selected_lab = st.selectbox("Select Lab", labs)
    filtered = df[df["title"] == selected_lab].sort_values("avg_score")

    fig = px.bar(filtered, x="question_key", y="avg_score",
                 title=f"Question Scores — {selected_lab}")
    st.plotly_chart(fig, use_container_width=True)

    st.subheader("Detailed Difficulty Ranking")
    df_detail = load_query("question_difficulty_ranking.sql", labcreator_engine)
    detail_filtered = df_detail[df_detail["title"] == selected_lab].sort_values("avg_score")
    st.dataframe(detail_filtered)
